// Disable Dropzone auto discover
Dropzone.autoDiscover = false;

// Global state for current mapping data
let currentMapping = null;
let originalXmlStructure = null;
let filteredMappings = null;
let forceUpdate = null;
let orderPreferenceModalOpen = false;

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

    const mapping = {
        conditions: [],
        value: '',
        conditionSets: [] // New structure for enhanced support
    };

    // Check for ifelse structure (format 1)
    const ifElseNode = fieldNode.getElementsByTagName('ifelse')[0];
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

                // Determine the output format for this condition set
                let outputFormat = 'VALUE'; // Default
                let resultValue = '';

                // Check if using src or value tag for the result
                const srcNode = ifNode.getElementsByTagName('src')[0];
                const valueNode = ifNode.getElementsByTagName('value')[0];

                if (srcNode) {
                    resultValue = srcNode.textContent;
                    outputFormat = 'SOURCE';
                } else if (valueNode) {
                    resultValue = valueNode.textContent;
                    outputFormat = 'VALUE';
                }

                // Add to conditions array (for backward compatibility)
                mapping.conditions = [...mapping.conditions, ...conditions];

                // Add to condition sets (new format)
                mapping.conditionSets.push({
                    conditions: conditions,
                    value: resultValue,
                    outputFormat: outputFormat
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

                // Determine output format for this condition
                let outputFormat = 'VALUE'; // Default
                let resultValue = '';

                const srcNode = elseIfNode.getElementsByTagName('src')[0];
                const valueNode = elseIfNode.getElementsByTagName('value')[0];

                if (srcNode) {
                    resultValue = srcNode.textContent;
                    outputFormat = 'SOURCE';
                } else if (valueNode) {
                    resultValue = valueNode.textContent;
                    outputFormat = 'VALUE';
                }

                mapping.conditionSets.push({
                    conditions: conditions,
                    value: resultValue,
                    outputFormat: outputFormat
                });
            }
        });

        // Process else node
        if (elseNodes.length > 0) {
            const elseNode = elseNodes[0];
            let outputFormat = 'VALUE'; // Default
            let defaultValue = '';

            const srcNode = elseNode.getElementsByTagName('src')[0];
            const valueNode = elseNode.getElementsByTagName('value')[0];

            if (srcNode) {
                defaultValue = srcNode.textContent;
                outputFormat = 'SOURCE';
            } else if (valueNode) {
                defaultValue = valueNode.textContent;
                outputFormat = 'VALUE';
            }

            mapping.conditionSets.push({
                conditions: [], // Empty conditions = else
                value: defaultValue,
                outputFormat: outputFormat
            });

            // Set the main default value
            mapping.value = defaultValue;
        } else {
            // Check for a default value at the ifelse level
            let defaultValue = '';
            let outputFormat = 'VALUE'; // Default

            const srcNode = ifElseNode.getElementsByTagName('src')[0];
            const valueNode = ifElseNode.getElementsByTagName('value')[0];

            if (srcNode) {
                defaultValue = srcNode.textContent;
                outputFormat = 'SOURCE';
            } else if (valueNode) {
                defaultValue = valueNode.textContent;
                outputFormat = 'VALUE';
            }

            // If we have condition sets but no else, add a default condition set
            if (mapping.conditionSets.length > 0 && !mapping.conditionSets.some(set => set.conditions.length === 0)) {
                mapping.conditionSets.push({
                    conditions: [], // Empty conditions = default
                    value: defaultValue,
                    outputFormat: outputFormat
                });
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
        const outputFormat = 'VALUE';

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
                    value: resultValue,
                    outputFormat: outputFormat
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
        // Process if node
        for (let i = 0; i < ifNodes.length; i++) {
            const ifNode = ifNodes[i];
            const refNode = ifNode.getElementsByTagName('ref')[0];

            // Determine output format for this node
            let outputFormat = 'VALUE';
            let srcNode = ifNode.getElementsByTagName('src')[0];
            let valueNode = ifNode.getElementsByTagName('value')[0];

            if (srcNode && !valueNode) {
                outputFormat = 'SOURCE';
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
                if (outputFormat === 'SOURCE') {
                    resultValue = srcNode ? srcNode.textContent : '';
                } else {
                    resultValue = valueNode ? valueNode.textContent : '';
                }

                mapping.conditionSets.push({
                    conditions: conditions,
                    value: resultValue,
                    outputFormat: outputFormat
                });

                // Add to main conditions for backward compatibility
                mapping.conditions = [...mapping.conditions, ...conditions];
            } else if (refNode) {
                // This is a ref-based condition
                let srcContent = '';
                if (srcNode) {
                    srcContent = srcNode.textContent;
                    outputFormat = 'SOURCE';
                }

                const conditions = [{
                    src: srcContent || '',
                    oper: 'EQUALS',
                    value: refNode.textContent || ''
                }];

                mapping.conditionSets.push({
                    conditions: conditions,
                    value: srcContent || (valueNode ? valueNode.textContent : ''),
                    outputFormat: outputFormat
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
            let outputFormat = 'VALUE';
            let resultValue = '';

            const srcNode = elseNode.getElementsByTagName('src')[0];
            const valueNode = elseNode.getElementsByTagName('value')[0];

            if (srcNode) {
                resultValue = srcNode.textContent;
                outputFormat = 'SOURCE';
            } else if (valueNode) {
                resultValue = valueNode.textContent;
                outputFormat = 'VALUE';
            }

            mapping.conditionSets.push({
                conditions: [], // Empty conditions = else
                value: resultValue,
                outputFormat: outputFormat
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
            value: '',
            outputFormat: 'VALUE'
        }]
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

        // Extract XML comments before parsing the fields
        const comments = extractComments(xmlString);

        currentMapping = extractMappingData(xmlDoc, comments);
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
function extractMappingData(xmlDoc, comments) {
    console.log("Extracting mapping data from XML");
    const mappings = [];
    const fieldNodes = xmlDoc.getElementsByTagName('field');
    console.log("Field nodes found:", fieldNodes.length);

    // Get the XML string representation of each field node
    // We need this to find comment positions
    const fieldStrings = [];
    const serializer = new XMLSerializer();
    for (let i = 0; i < fieldNodes.length; i++) {
        fieldStrings.push(serializer.serializeToString(fieldNodes[i]));
    }

    // Calculate positions of fields in the original XML
    let currentPosition = originalXmlStructure.indexOf('<field>');
    const fieldPositions = [];
    for (let i = 0; i < fieldStrings.length; i++) {
        fieldPositions.push(currentPosition);
        currentPosition = originalXmlStructure.indexOf('<field>', currentPosition + 1);
    }

    for (let i = 0; i < fieldNodes.length; i++) {
        const fieldNode = fieldNodes[i];
        const mapping = {
            fieldName: '',
            mappingType: 'NONE',
            notes: '',
            tickets: '',
            status: 'GOOD',
            comments: [] // Array to store comments
        };

        // Associate comments with this field based on position
        if (comments && comments.length > 0) {
            const fieldStart = fieldPositions[i];
            const fieldEnd = i < fieldPositions.length - 1 ? fieldPositions[i + 1] : originalXmlStructure.length;

            // Find comments that belong to this field
            comments.forEach(comment => {
                if (comment.position >= fieldStart && comment.position < fieldEnd) {
                    mapping.comments.push(comment.text);
                }
            });
        }

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

    let xmlContent = '';

    // Preserve original XML content before <fields> tag if it exists
    if (originalXmlStructure) {
        const fieldsTagIndex = originalXmlStructure.indexOf('<fields>');
        if (fieldsTagIndex !== -1) {
            // Extract and use the header content
            xmlContent = originalXmlStructure.substring(0, fieldsTagIndex);
            // Ensure we have the <fields> tag
            xmlContent += '<fields>\n';
        } else {
            // If no fields tag in original, use default header
            xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<mappings>\n<fields>\n';
        }
    } else {
        // Default header if no original structure
        xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<mappings>\n<fields>\n';
    }

    // Generate XML for each mapping
    currentMapping.forEach(mapping => {
        xmlContent += generateMappingXml(mapping);
    });

    // Close the fields tag appropriately
    if (originalXmlStructure && originalXmlStructure.includes('</fields>')) {
        xmlContent += '</fields>\n';

        // Check if there's content after the </fields> closing tag
        const closingFieldsIndex = originalXmlStructure.indexOf('</fields>') + '</fields>'.length;
        if (closingFieldsIndex < originalXmlStructure.length) {
            // Append any content that appears after the </fields> tag
            xmlContent += originalXmlStructure.substring(closingFieldsIndex);
        } else {
            // Otherwise just close the mappings tag
            xmlContent += '</mappings>';
        }
    } else {
        // Default closing tags
        xmlContent += '</fields>\n</mappings>';
    }

    return xmlContent;
}

// Function to extract comment tags from source XML
function extractComments(xmlString) {
    const comments = [];
    let startIndex = 0;

    while (true) {
        const commentStart = xmlString.indexOf('<!--', startIndex);
        if (commentStart === -1) break;

        const commentEnd = xmlString.indexOf('-->', commentStart);
        if (commentEnd === -1) break;

        comments.push({
            text: xmlString.substring(commentStart, commentEnd + 3),
            position: commentStart
        });

        startIndex = commentEnd + 3;
    }

    return comments;
}

// Generate XML for a single mapping
function generateMappingXml(mapping) {
    let xml = '  <field>\n';
    xml += `    <dest>${escapeXml(mapping.fieldName)}</dest>\n`;

    // Preserve any comment that might exist in the original XML
    if (mapping.comments && mapping.comments.length > 0) {
        mapping.comments.forEach(comment => {
            xml += `    ${comment}\n`;
        });
    }

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

    // First add status
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
                    const isSourceFormat = conditionSet.outputFormat === 'SOURCE';
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
            // Use the format of the first condition set for consistency
            const defaultSet = derivedMapping.conditionSets[0];
            const isSourceFormat = defaultSet && defaultSet.outputFormat === 'SOURCE';
            const defaultValue = defaultSet?.value || '';

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

                    // Add the result with the appropriate tag based on this condition set's format
                    const isSourceFormat = conditionSet.outputFormat === 'SOURCE';
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
                const isSourceFormat = elseSet.outputFormat === 'SOURCE';
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
        // Determine format from the global setting (backward compatibility)
        const isSourceFormat = derivedMapping.outputFormat === 'SOURCE';

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

    // Show order preference modal instead of immediately saving
    showOrderPreferenceModal();
}

// New function to show the field order preference modal
function showOrderPreferenceModal() {
    console.log("Opening order preference modal");
    const modalRoot = document.getElementById('orderPreferenceModalRoot');
    if (!modalRoot) {
        console.error("Order preference modal root not found");
        return;
    }

    orderPreferenceModalOpen = true;

    ReactDOM.render(
        React.createElement(window.OrderPreferenceModal, {
            isOpen: true,
            onClose: () => {
                orderPreferenceModalOpen = false;
                ReactDOM.unmountComponentAtNode(modalRoot);
            },
            onSave: (preference) => {
                console.log("Saving with preference:", preference);
                processSaveWithPreference(preference);
                orderPreferenceModalOpen = false;
                ReactDOM.unmountComponentAtNode(modalRoot);
            }
        }),
        modalRoot
    );
}

// New function to handle the actual saving with the selected preference
function processSaveWithPreference(preference) {
    try {
        // If preference is alphabetical, sort the mapping
        if (preference === 'alphabetical') {
            currentMapping.sort((a, b) => a.fieldName.toLowerCase().localeCompare(b.fieldName.toLowerCase()));
            console.log("Sorted mapping alphabetically");
        } else {
            console.log("Preserving original field order");
        }

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

// Download XML file - keeping your original function
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

// Clean up any existing dialogs - updated to include the new modal
function cleanupDialogs() {
    const dialogRoot = document.getElementById('mappingTableDialogRoot');
    if (dialogRoot) {
        ReactDOM.unmountComponentAtNode(dialogRoot);
    }

    // Also clean up order preference modal
    const orderPreferenceModalRoot = document.getElementById('orderPreferenceModalRoot');
    if (orderPreferenceModalRoot) {
        ReactDOM.unmountComponentAtNode(orderPreferenceModalRoot);
    }
}

// Update the beforeunload handler to check for the order preference modal
window.addEventListener('beforeunload', (event) => {
    if ((currentMapping && currentMapping.length > 0) || orderPreferenceModalOpen) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        event.returnValue = message;
        return message;
    }
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