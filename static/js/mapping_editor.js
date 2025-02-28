// Disable Dropzone auto discover
Dropzone.autoDiscover = false;

// Global state for current mapping data
let currentMapping = null;
let originalXmlStructure = null;
let filteredMappings = null;
let forceUpdate = null;

// Constants for mapping types
const MAPPING_TYPES = [
    'AGGREGATED',
    'DEFAULTED',
    'DERIVED',
    'ENRICHED',
    'FORMATTED',
    'MAPPED',
    'PASSED_THROUGH',
    'NONE'
];

// Set up force update function
function setForceUpdate(updateFunction) {
    console.log("Setting forceUpdate function");
    forceUpdate = updateFunction;
}

// Update React components
function updateReactComponents() {
    console.log("Updating React components, currentMapping:", currentMapping);
    if (forceUpdate) {
        console.log("Calling forceUpdate");
        forceUpdate(Date.now());
    } else if (tableContainer && window.ReactDOM && window.EnhancedMappingTable) {
        console.warn("forceUpdate not set, forcing re-render");
        ReactDOM.render(
            React.createElement(window.EnhancedMappingTable),
            tableContainer
        );
    } else {
        console.error("Cannot update components: missing dependencies or tableContainer");
    }
}

// Initialize React components with retry logic
function initializeReactComponents() {
    console.log("Initializing React components, checking dependencies...");
    const tableContainer = document.getElementById('mappingTableContainer');

    // Check for DOM elements
    if (!tableContainer) {
        console.error("Missing DOM elements:", { tableContainer });
        return;
    }

    // Check for React and ReactDOM
    if (typeof ReactDOM === 'undefined' || typeof React === 'undefined') {
        console.error("React or ReactDOM not loaded");
        return;
    }

    // Check for custom components
    if (!window.EnhancedMappingTable) {
        console.error("Custom React components not loaded:", { EnhancedMappingTable: !!window.EnhancedMappingTable });
        // Retry after a short delay if components are missing
        setTimeout(initializeReactComponents, 100);
        return;
    }

    // Render EnhancedMappingTable
    if (tableContainer) {
        console.log("Rendering EnhancedMappingTable, initial currentMapping:", currentMapping);
        ReactDOM.render(
            React.createElement(window.EnhancedMappingTable),
            tableContainer
        );
    }
}

// Initialize event listeners
function initializeEventListeners() {
    console.log("Initializing event listeners");

    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) {
        addRowBtn.removeEventListener('click', handleAddRow);
        addRowBtn.addEventListener('click', handleAddRow);
        console.log("Add row button listener attached");
    }

    const saveChangesBtn = document.getElementById('saveChangesBtn');
    if (saveChangesBtn) {
        saveChangesBtn.removeEventListener('click', handleSaveChanges);
        saveChangesBtn.addEventListener('click', handleSaveChanges);
        console.log("Save changes button listener attached");
    }
}

// Document ready handler
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM Content Loaded");

    // Remove the FilterBar section as we're moving filtering to the table header
    const filterSection = document.getElementById('filterSection');
    if (filterSection) {
        filterSection.style.display = 'none';
    }

    const dropzone = new Dropzone("#xmlDropzone", {
        url: "/upload_mapping",
        autoProcessQueue: false,
        maxFiles: 1,
        acceptedFiles: ".xml",
        addRemoveLinks: true,
        createImageThumbnails: false
    });

    dropzone.on("addedfile", function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            parseAndDisplayMapping(e.target.result);
        };
        reader.readAsText(file);
    });

    initializeEventListeners();
    initializeReactComponents();
});

// Handle adding new row
function handleAddRow() {
    console.log("Adding new row, currentMapping before:", currentMapping);
    if (!currentMapping) {
        currentMapping = [];
    }

    // Create a new mapping with a unique fieldName to avoid sorting conflicts
    // Use timestamp to both identify new rows and for sorting
    const newMapping = {
        fieldName: `NewField_${Date.now()}`, // Unique identifier using timestamp
        mappingType: 'NONE',
        source: '',
        notes: '',
        tickets: '',
        status: 'GOOD',
        mappedValues: { src: '', mappings: [] }
    };

    // Push the new mapping to the array
    currentMapping.push(newMapping);
    console.log("Current mapping after add:", currentMapping);

    // Ensure the table updates with the new data
    updateReactComponents();
    window.scrollTo(0, 0);
}


// Handle mapping deletion
function handleMappingDelete(index) {
    console.log("Deleting row at index:", index);
    if (!currentMapping) return;

    if (confirm('Are you sure you want to delete this mapping?')) {
        currentMapping.splice(index, 1);
        console.log("Current mapping after delete:", currentMapping);
        updateReactComponents();
    }
}

// Handle mapping updates
function handleMappingUpdate(index, field, value) {
    console.log("Updating mapping:", index, field, value);
    if (!currentMapping || index >= currentMapping.length) return;

    const mapping = currentMapping[index];
    mapping[field] = value;

    if (field === 'mappingType') {
        resetMappingTypeData(mapping, value);
    }

    updateReactComponents();
}

// Reset mapping type specific data
function resetMappingTypeData(mapping, newType) {
    mapping.source = '';
    mapping.derivedMapping = null;
    mapping.mappedValues = null;

    switch (newType) {
        case 'DERIVED':
            mapping.derivedMapping = { conditions: [], value: '' };
            break;
        case 'MAPPED':
            mapping.mappedValues = { src: '', mappings: [] };
            break;
    }
}

// Make these functions available globally
window.handleAddRow = handleAddRow;
window.handleMappingDelete = handleMappingDelete;
window.handleMappingUpdate = handleMappingUpdate;
window.getCurrentMapping = () => currentMapping || [];

// Extract derived mapping data
function extractDerivedMapping(fieldNode) {
    console.log("Extracting derived mapping");

    // Determine if this is a source-tag format or value-tag format
    const ifElseNode = fieldNode.getElementsByTagName('ifelse')[0];
    let isSourceFormat = false;

    if (ifElseNode) {
        // Check if we have <src> tags instead of <value> tags in if nodes
        const ifNodes = ifElseNode.getElementsByTagName('if');
        for (let i = 0; i < ifNodes.length; i++) {
            const ifNode = ifNodes[i];
            if (ifNode.getElementsByTagName('src').length > 0) {
                isSourceFormat = true;
                break;
            }
        }
    }

    const mapping = {
        conditions: [],
        value: '',
        conditionSets: [], // New structure for enhanced support
        outputFormat: isSourceFormat ? 'SOURCE' : 'VALUE'
    };

    // Check for ifelse structure (format 1)
    if (ifElseNode) {
        const ifNodes = Array.from(ifElseNode.getElementsByTagName('if'));
        const elseIfNodes = Array.from(ifElseNode.getElementsByTagName('else-if'));
        const elseNodes = Array.from(ifElseNode.getElementsByTagName('else'));

        // Extract the conditions from each "if" node
        ifNodes.forEach(ifNode => {
            const andNode = ifNode.getElementsByTagName('and')[0];
            if (andNode) {
                const conditions = [];
                const condNodes = andNode.getElementsByTagName('cond');
                Array.from(condNodes).forEach(condNode => {
                    conditions.push({
                        src: condNode.getElementsByTagName('src')[0]?.textContent || '',
                        oper: condNode.getElementsByTagName('oper')[0]?.textContent || 'EQUALS',
                        value: condNode.getElementsByTagName('value')[0]?.textContent || ''
                    });
                });

                // Get the value for this condition set
                // Check if using src or value tag for the result
                let resultValue = '';
                if (isSourceFormat) {
                    const srcNode = ifNode.getElementsByTagName('src')[0];
                    resultValue = srcNode ? srcNode.textContent : '';
                } else {
                    const valueNode = ifNode.getElementsByTagName('value')[0];
                    resultValue = valueNode ? valueNode.textContent : '';
                }

                // Add to conditions array (for backward compatibility)
                mapping.conditions = [...mapping.conditions, ...conditions];

                // Add to condition sets (new format)
                mapping.conditionSets.push({
                    conditions: conditions,
                    value: resultValue
                });
            }
        });

        // Process else-if nodes
        elseIfNodes.forEach(elseIfNode => {
            const andNode = elseIfNode.getElementsByTagName('and')[0];
            if (andNode) {
                const conditions = [];
                const condNodes = andNode.getElementsByTagName('cond');
                Array.from(condNodes).forEach(condNode => {
                    conditions.push({
                        src: condNode.getElementsByTagName('src')[0]?.textContent || '',
                        oper: condNode.getElementsByTagName('oper')[0]?.textContent || 'EQUALS',
                        value: condNode.getElementsByTagName('value')[0]?.textContent || ''
                    });
                });

                // Get the value for this condition set
                let resultValue = '';
                if (isSourceFormat) {
                    const srcNode = elseIfNode.getElementsByTagName('src')[0];
                    resultValue = srcNode ? srcNode.textContent : '';
                } else {
                    const valueNode = elseIfNode.getElementsByTagName('value')[0];
                    resultValue = valueNode ? valueNode.textContent : '';
                }

                mapping.conditionSets.push({
                    conditions: conditions,
                    value: resultValue
                });
            }
        });

        // Process else node
        if (elseNodes.length > 0) {
            const elseNode = elseNodes[0];
            let defaultValue = '';

            if (isSourceFormat) {
                const srcNode = elseNode.getElementsByTagName('src')[0];
                defaultValue = srcNode ? srcNode.textContent : '';
            } else {
                const valueNode = elseNode.getElementsByTagName('value')[0];
                defaultValue = valueNode ? valueNode.textContent : '';
            }

            mapping.conditionSets.push({
                conditions: [], // Empty conditions = else
                value: defaultValue
            });

            // Set the main default value
            mapping.value = defaultValue;
        } else {
            // Check for a default value at the ifelse level
            let defaultValue = '';

            if (isSourceFormat) {
                const srcNode = ifElseNode.getElementsByTagName('src')[0];
                defaultValue = srcNode ? srcNode.textContent : '';
            } else {
                const valueNode = ifElseNode.getElementsByTagName('value')[0];
                defaultValue = valueNode ? valueNode.textContent : '';
            }

            // Set the main default value
            mapping.value = defaultValue;
        }

        return mapping;
    }

    // Check for ctable structure (format 2)
    const ctableNode = fieldNode.getElementsByTagName('ctable')[0];
    if (ctableNode) {
        // For ctable format, always use VALUE format
        mapping.outputFormat = 'VALUE';

        // Extract source columns
        const colsNode = ctableNode.getElementsByTagName('cols')[0];
        let sourceFields = [];

        if (colsNode) {
            const srcNodes = colsNode.getElementsByTagName('src');
            sourceFields = Array.from(srcNodes).map(node => node.textContent);
        }

        // Extract rows
        const rowNodes = ctableNode.getElementsByTagName('row');
        Array.from(rowNodes).forEach(rowNode => {
            const valueNodes = rowNode.getElementsByTagName('value');
            if (valueNodes.length >= 2) {
                const conditions = [];

                // Use the first value as condition value and the last as result
                const conditionValue = valueNodes[0].textContent;
                const resultValue = valueNodes[valueNodes.length - 1].textContent;

                // Create a condition for each source field
                if (sourceFields.length > 0) {
                    conditions.push({
                        src: sourceFields[0],
                        oper: 'EQUALS',
                        value: conditionValue
                    });
                }

                // Add to condition sets
                mapping.conditionSets.push({
                    conditions: conditions,
                    value: resultValue
                });

                // Add to main conditions array for backward compatibility
                mapping.conditions = [...mapping.conditions, ...conditions];
            }
        });

        // If there are condition sets, use the first one for backward compatibility
        if (mapping.conditionSets.length > 0) {
            mapping.value = mapping.conditionSets[0].value;
        }

        return mapping;
    }

    // Check for the if/else structure with direct <if> and <else> tags
    const ifNodes = fieldNode.getElementsByTagName('if');
    const elseNodes = fieldNode.getElementsByTagName('else');

    if (ifNodes.length > 0 || elseNodes.length > 0) {
        // Determine format for this structure
        for (let i = 0; i < ifNodes.length; i++) {
            if (ifNodes[i].getElementsByTagName('src').length > 0) {
                mapping.outputFormat = 'SOURCE';
                break;
            }
        }

        // Process if node
        for (let i = 0; i < ifNodes.length; i++) {
            const ifNode = ifNodes[i];
            const refNode = ifNode.getElementsByTagName('ref')[0];

            let srcNode, valueNode;
            if (mapping.outputFormat === 'SOURCE') {
                srcNode = ifNode.getElementsByTagName('src')[0];
            } else {
                valueNode = ifNode.getElementsByTagName('value')[0];
            }

            const andNode = ifNode.getElementsByTagName('and')[0];
            if (andNode) {
                const conditions = [];
                const condNodes = andNode.getElementsByTagName('cond');
                Array.from(condNodes).forEach(condNode => {
                    conditions.push({
                        src: condNode.getElementsByTagName('src')[0]?.textContent || '',
                        oper: condNode.getElementsByTagName('oper')[0]?.textContent || 'EQUALS',
                        value: condNode.getElementsByTagName('value')[0]?.textContent || ''
                    });
                });

                // Get result value based on format
                let resultValue = '';
                if (mapping.outputFormat === 'SOURCE') {
                    resultValue = srcNode ? srcNode.textContent : '';
                } else {
                    resultValue = valueNode ? valueNode.textContent : '';
                }

                mapping.conditionSets.push({
                    conditions: conditions,
                    value: resultValue
                });

                // Add to main conditions for backward compatibility
                mapping.conditions = [...mapping.conditions, ...conditions];
            } else if (refNode) {
                // This is a ref-based condition
                let srcContent = '';
                if (mapping.outputFormat === 'SOURCE') {
                    srcContent = srcNode ? srcNode.textContent : '';
                }

                const conditions = [{
                    src: srcContent || '',
                    oper: 'EQUALS',
                    value: refNode.textContent || ''
                }];

                mapping.conditionSets.push({
                    conditions: conditions,
                    value: srcContent || (valueNode ? valueNode.textContent : '')
                });

                // Add to main conditions
                mapping.conditions.push({
                    src: srcContent || '',
                    oper: 'EQUALS',
                    value: refNode.textContent || ''
                });
            }
        }

        // Process else node
        for (let i = 0; i < elseNodes.length; i++) {
            const elseNode = elseNodes[i];
            let resultValue = '';

            if (mapping.outputFormat === 'SOURCE') {
                const srcNode = elseNode.getElementsByTagName('src')[0];
                resultValue = srcNode ? srcNode.textContent : '';
            } else {
                const valueNode = elseNode.getElementsByTagName('value')[0];
                resultValue = valueNode ? valueNode.textContent : '';
            }

            mapping.conditionSets.push({
                conditions: [], // Empty conditions = else
                value: resultValue
            });

            // Use this as default value
            mapping.value = resultValue;
        }

        return mapping;
    }

    // If we can't identify a format, return a default structure
    return {
        conditions: [],
        value: '',
        conditionSets: [{
            conditions: [],
            value: ''
        }],
        outputFormat: 'VALUE'
    };
}

// Extract MAPPED mapping data
function extractMappedValues(fieldNode) {
    console.log("Extracting mapped values");
    const ctableNode = fieldNode.getElementsByTagName('ctable')[0];
    if (!ctableNode) return null;

    const result = {
        src: '',
        mappings: []
    };

    const colsNode = ctableNode.getElementsByTagName('cols')[0];
    if (colsNode) {
        const srcNode = colsNode.getElementsByTagName('src')[0];
        if (srcNode) {
            result.src = srcNode.textContent;
        }
    }

    const rowNodes = ctableNode.getElementsByTagName('row');
    result.mappings = Array.from(rowNodes)
        .map(row => {
            const values = row.getElementsByTagName('value');
            if (values.length >= 2) {
                return {
                    from: values[0].textContent,
                    to: values[1].textContent
                };
            }
            return null;
        })
        .filter(mapping => mapping !== null);

    return result;
}
// Parse and display mapping
function parseAndDisplayMapping(xmlString) {
    try {
        console.log("Parsing XML string:", xmlString);
        originalXmlStructure = xmlString;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML parsing failed');
        }

        currentMapping = extractMappingData(xmlDoc);
        console.log("Current mapping set:", currentMapping);
        console.log("getCurrentMapping result:", window.getCurrentMapping());

        const editorSection = document.getElementById('editorSection');
        if (editorSection) {
            editorSection.classList.remove('d-none');
            console.log("Editor section displayed");
        } else {
            console.error("Editor section not found");
        }

        updateReactComponents();
    } catch (error) {
        console.error('Error parsing XML:', error);
        alert('Error parsing XML file: ' + error.message);
    }
}

// Extract mapping data from XML
function extractMappingData(xmlDoc) {
    console.log("Extracting mapping data from XML");
    const mappings = [];
    const fieldNodes = xmlDoc.getElementsByTagName('field');
    console.log("Field nodes found:", fieldNodes.length);

    for (let i = 0; i < fieldNodes.length; i++) {
        const fieldNode = fieldNodes[i];
        const mapping = {
            fieldName: '',
            mappingType: 'NONE',
            notes: '',
            tickets: '',
            status: 'GOOD'
        };

        const destNode = fieldNode.getElementsByTagName('dest')[0];
        if (destNode) {
            mapping.fieldName = destNode.textContent;
        }

        const mappingTypeNode = fieldNode.getElementsByTagName('mapping-type')[0];
        if (mappingTypeNode) {
            mapping.mappingType = mappingTypeNode.textContent;
        }

        const notesNode = fieldNode.getElementsByTagName('notes')[0];
        if (notesNode) {
            mapping.notes = notesNode.textContent;
        }

        // Updated ticket parsing to handle <tickets> wrapper tag
        // First try the new format with <tickets> wrapper
        const ticketsNode = fieldNode.getElementsByTagName('tickets')[0];
        if (ticketsNode) {
            const jiraNodes = ticketsNode.getElementsByTagName('jira');
            mapping.tickets = Array.from(jiraNodes)
                .map(node => node.textContent)
                .join('\n');
        } else {
            // Fallback to the old format for backward compatibility
            const jiraNodes = fieldNode.getElementsByTagName('jira');
            mapping.tickets = Array.from(jiraNodes)
                .map(node => node.textContent)
                .join('\n');
        }

        const statusNode = fieldNode.getElementsByTagName('status')[0];
        if (statusNode) {
            mapping.status = statusNode.textContent;
        }

        switch (mapping.mappingType) {
            case 'PASSED_THROUGH':
                const srcNode = fieldNode.getElementsByTagName('src')[0];
                mapping.source = srcNode ? srcNode.textContent : '';
                break;
            case 'DERIVED':
                mapping.derivedMapping = extractDerivedMapping(fieldNode);
                break;
            case 'MAPPED':
                mapping.mappedValues = extractMappedValues(fieldNode);
                break;
        }

        mappings.push(mapping);
        console.log(`Extracted mapping ${i + 1}:`, mapping);
    }

    return mappings.sort((a, b) => a.fieldName.toLowerCase().localeCompare(b.fieldName.toLowerCase()));
}
// Generate XML for saving
function generateXml() {
    console.log("Generating XML");
    if (!currentMapping) return null;

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<mappings>\n';
    currentMapping.forEach(mapping => {
        xmlContent += generateMappingXml(mapping);
    });
    xmlContent += '</mappings>';
    return xmlContent;
}

// Generate XML for a single mapping
function generateMappingXml(mapping) {
    let xml = '  <field>\n';
    xml += `    <dest>${escapeXml(mapping.fieldName)}</dest>\n`;
    xml += `    <mapping-type>${escapeXml(mapping.mappingType)}</mapping-type>\n`;

    switch (mapping.mappingType) {
        case 'PASSED_THROUGH':
            if (mapping.source) {
                xml += `    <src>${escapeXml(mapping.source)}</src>\n`;
            }
            break;
        case 'DERIVED':
            xml += generateDerivedXml(mapping.derivedMapping);
            break;
        case 'MAPPED':
            xml += generateMappedXml(mapping.mappedValues);
            break;
    }

    if (mapping.notes) {
        xml += `    <notes>${escapeXml(mapping.notes)}</notes>\n`;
    }

    // First add status (changed order)
    xml += `    <status>${escapeXml(mapping.status)}</status>\n`;

    // Then add tickets with <tickets> wrapper tags
    if (mapping.tickets && mapping.tickets.trim()) {
        const ticketLines = mapping.tickets.split('\n')
            .filter(ticket => ticket.trim())
            .map(ticket => `      <jira>${escapeXml(ticket.trim())}</jira>`)
            .join('\n');

        if (ticketLines) {
            xml += '    <tickets>\n';
            xml += ticketLines + '\n';
            xml += '    </tickets>\n';
        }
    }

    xml += '  </field>\n';
    return xml;
}

// Generate XML for derived mapping
function generateDerivedXml(derivedMapping) {
    if (!derivedMapping) return '';

    let xml = '';

    // Determine if we're using SOURCE format or VALUE format
    const isSourceFormat = derivedMapping.outputFormat === 'SOURCE';

    // If we have multiple condition sets, use the ifelse format
    if (derivedMapping.conditionSets && derivedMapping.conditionSets.length > 0) {
        // Check if we're using the if/else structure or ifelse structure
        const hasIfElseIf = derivedMapping.conditionSets.some(set =>
            set.conditions.length > 0 && set.conditions.some(cond => cond.src.includes('.')));

        if (!hasIfElseIf) {
            xml += '    <ifelse>\n';

            // Generate if nodes for each condition set
            derivedMapping.conditionSets.forEach(conditionSet => {
                if (conditionSet.conditions.length > 0) {
                    xml += '      <if>\n';
                    xml += '        <and>\n';

                    // Generate condition nodes
                    conditionSet.conditions.forEach(condition => {
                        xml += '          <cond>\n';
                        xml += `            <src>${escapeXml(condition.src)}</src>\n`;
                        xml += `            <oper>${escapeXml(condition.oper)}</oper>\n`;
                        xml += `            <value>${escapeXml(condition.value)}</value>\n`;
                        xml += '          </cond>\n';
                    });

                    xml += '        </and>\n';

                    // Add the result using either <src> or <value> tag based on the outputFormat
                    if (isSourceFormat) {
                        // When using source format, use <src> tag
                        xml += `        <src>${escapeXml(conditionSet.value)}</src>\n`;
                    } else {
                        // When using value format, use <value> tag
                        xml += `        <value>${escapeXml(conditionSet.value)}</value>\n`;
                    }

                    xml += '      </if>\n';
                }
            });

            // Add a default value with the appropriate tag
            const defaultValue = derivedMapping.conditionSets[0]?.value || derivedMapping.value || '';
            if (isSourceFormat) {
                xml += `      <src>${escapeXml(defaultValue)}</src>\n`;
            } else {
                xml += `      <value>${escapeXml(defaultValue)}</value>\n`;
            }

            xml += '    </ifelse>\n';
        } else {
            // Handle complex if/else-if/else structure seen in Image 3
            xml += '    <ifelse>\n';

            // First handle all condition sets with conditions (if and else-if)
            let isFirstIf = true;
            derivedMapping.conditionSets.forEach(conditionSet => {
                if (conditionSet.conditions.length > 0) {
                    // First condition set uses <if>, others use <else-if>
                    if (isFirstIf) {
                        xml += '      <if>\n';
                        isFirstIf = false;
                    } else {
                        xml += '      <else-if>\n';
                    }

                    // Check if there are ref tags to use
                    const hasRef = conditionSet.conditions.some(cond => cond.src.includes('Ref'));

                    if (hasRef) {
                        const refValue = conditionSet.conditions[0]?.value || '';
                        xml += `        <ref>${escapeXml(refValue)}</ref>\n`;

                        // Add conditions if we have them
                        if (conditionSet.conditions.length > 0) {
                            xml += '        <and>\n';
                            conditionSet.conditions.forEach(condition => {
                                xml += '          <cond>\n';
                                xml += `            <src>${escapeXml(condition.src)}</src>\n`;
                                xml += `            <oper>${escapeXml(condition.oper)}</oper>\n`;

                                // For complex conditions with source fields
                                if (condition.src !== condition.value && condition.value) {
                                    xml += `            <value>${escapeXml(condition.value)}</value>\n`;
                                } else if (condition.src === condition.value) {
                                    xml += `            <src>${escapeXml(condition.src)}</src>\n`;
                                }

                                xml += '          </cond>\n';
                            });
                            xml += '        </and>\n';
                        }
                    } else {
                        xml += '        <and>\n';
                        conditionSet.conditions.forEach(condition => {
                            xml += '          <cond>\n';
                            xml += `            <src>${escapeXml(condition.src)}</src>\n`;
                            xml += `            <oper>${escapeXml(condition.oper)}</oper>\n`;
                            xml += `            <value>${escapeXml(condition.value)}</value>\n`;
                            xml += '          </cond>\n';
                        });
                        xml += '        </and>\n';
                    }

                    // Add the result with the appropriate tag
                    if (isSourceFormat) {
                        xml += `        <src>${escapeXml(conditionSet.value)}</src>\n`;
                    } else {
                        xml += `        <value>${escapeXml(conditionSet.value)}</value>\n`;
                    }

                    // Close the if or else-if tag
                    if (isFirstIf) {
                        xml += '      </if>\n';
                    } else {
                        xml += '      </else-if>\n';
                    }
                }
            });

            // Handle the default case (else)
            const elseSet = derivedMapping.conditionSets.find(set => set.conditions.length === 0);
            if (elseSet) {
                xml += '      <else>\n';
                if (isSourceFormat) {
                    xml += `        <src>${escapeXml(elseSet.value)}</src>\n`;
                } else {
                    xml += `        <value>${escapeXml(elseSet.value)}</value>\n`;
                }
                xml += '      </else>\n';
            }

            xml += '    </ifelse>\n';
        }
    }
    // Fallback to the old format
    else if (derivedMapping.conditions && derivedMapping.conditions.length > 0) {
        xml += '    <ifelse>\n';
        xml += '      <if>\n';
        xml += '        <and>\n';

        // Generate condition nodes
        derivedMapping.conditions.forEach(condition => {
            xml += '          <cond>\n';
            xml += `            <src>${escapeXml(condition.src)}</src>\n`;
            xml += `            <oper>${escapeXml(condition.oper)}</oper>\n`;
            xml += `            <value>${escapeXml(condition.value)}</value>\n`;
            xml += '          </cond>\n';
        });

        xml += '        </and>\n';

        // Use appropriate tag based on output format
        if (isSourceFormat) {
            xml += `        <src>${escapeXml(derivedMapping.value)}</src>\n`;
        } else {
            xml += `        <value>${escapeXml(derivedMapping.value)}</value>\n`;
        }

        xml += '      </if>\n';

        // Add default with appropriate tag
        if (isSourceFormat) {
            xml += `      <src>${escapeXml(derivedMapping.value)}</src>\n`;
        } else {
            xml += `      <value>${escapeXml(derivedMapping.value)}</value>\n`;
        }

        xml += '    </ifelse>\n';
    }

    return xml;
}

// Generate XML for mapped values
function generateMappedXml(mappedValues) {
    if (!mappedValues) return '';

    let xml = '    <ctable>\n';
    xml += '      <cols>\n';
    xml += `        <src>${escapeXml(mappedValues.src)}</src>\n`;
    xml += '      </cols>\n';
    mappedValues.mappings.forEach(mapping => {
        xml += '      <row>\n';
        xml += `        <value>${escapeXml(mapping.from)}</value>\n`;
        xml += `        <value>${escapeXml(mapping.to)}</value>\n`;
        xml += '      </row>\n';
    });
    xml += '    </ctable>\n';
    return xml;
}

// Escape XML special characters
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// Show mapped dialog
function showMappedDialog(mapping, index) {
    console.log("Opening mapped dialog for index:", index);
    const dialogRoot = document.getElementById('mappingTableDialogRoot');
    if (!dialogRoot) {
        console.error("Dialog root not found");
        return;
    }

    const mappedData = {
        src: mapping.mappedValues?.src || '',
        mappings: mapping.mappedValues?.mappings || []
    };

    ReactDOM.render(
        React.createElement(window.MappingTableDialog, {
            isOpen: true,
            onClose: () => {
                ReactDOM.unmountComponentAtNode(dialogRoot);
            },
            mappingType: 'MAPPED',
            initialData: mappedData,
            onSave: (newMapping) => {
                console.log("Saving mapped values:", newMapping);
                currentMapping[index].mappedValues = newMapping;
                updateReactComponents();
                ReactDOM.unmountComponentAtNode(dialogRoot);
            }
        }),
        dialogRoot
    );
}
// Show derived mapping dialog
function showDerivedMappingDialog(mapping, index) {
    console.log("Opening derived dialog for index:", index);
    const dialogRoot = document.getElementById('mappingTableDialogRoot');
    if (!dialogRoot) {
        console.error("Dialog root not found");
        return;
    }

    const derivedData = mapping.derivedMapping || {
        conditions: [],
        value: ''
    };

    ReactDOM.render(
        React.createElement(window.MappingTableDialog, {
            isOpen: true,
            onClose: () => {
                ReactDOM.unmountComponentAtNode(dialogRoot);
            },
            mappingType: 'DERIVED',
            initialData: derivedData,
            onSave: (newMapping) => {
                console.log("Saving derived mapping:", newMapping);
                currentMapping[index].derivedMapping = newMapping;
                updateReactComponents();
                ReactDOM.unmountComponentAtNode(dialogRoot);
            }
        }),
        dialogRoot
    );
}

// Handle saving changes
function handleSaveChanges() {
    console.log("Handling save changes");
    if (!currentMapping) {
        alert('No mapping data to save');
        return;
    }

    try {
        const xmlContent = generateXml();
        if (!xmlContent) {
            throw new Error('Failed to generate XML content');
        }

        downloadXmlFile(xmlContent);
    } catch (error) {
        console.error('Error saving XML:', error);
        alert('Failed to save the XML file: ' + error.message);
    }
}

// Download XML file
function downloadXmlFile(xmlContent) {
    console.log("Downloading XML file");
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapping.xml';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Clean up any existing dialogs
function cleanupDialogs() {
    const dialogRoot = document.getElementById('mappingTableDialogRoot');
    if (dialogRoot) {
        ReactDOM.unmountComponentAtNode(dialogRoot);
    }
}

// Handle window unload
window.addEventListener('unload', () => {
    cleanupDialogs();
});

// Export necessary functions to window object
window.showMappedDialog = showMappedDialog;
window.showDerivedMappingDialog = showDerivedMappingDialog;
window.handleSaveChanges = handleSaveChanges;
window.setForceUpdate = setForceUpdate;

// Additional Utility Functions
function validateMapping(mapping) {
    console.log("Validating mapping:", mapping);
    if (!mapping) return false;

    const requiredFields = ['fieldName', 'mappingType', 'status'];
    for (const field of requiredFields) {
        if (!mapping[field]) {
            console.warn(`Missing required field: ${field}`);
            return false;
        }
    }

    return true;
}

// Debug helper function
function logMappingState() {
    console.log("Current Mapping State:", {
        mappingCount: currentMapping ? currentMapping.length : 0,
        hasForceUpdate: !!forceUpdate
    });
}

// Handle browser refresh/navigation
window.addEventListener('beforeunload', (event) => {
    if (currentMapping && currentMapping.length > 0) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
    }
});