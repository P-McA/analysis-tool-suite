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
    if (!['PASSED_THROUGH', 'DEFAULTED'].includes(mapping.mappingType) &&
        !['PASSED_THROUGH', 'DEFAULTED'].includes(newType)) {
        mapping.source = '';
    }
    let savedConditions = null;
    if (mapping.derivedMapping && mapping.derivedMapping.conditions) {
        savedConditions = mapping.derivedMapping.conditions.map(cond => ({
            ...cond,
            additionalValues: cond.additionalValues || []
        }));
    }

    mapping.derivedMapping = null;
    mapping.mappedValues = null;

    switch (newType) {
        case 'DERIVED':
            mapping.derivedMapping = {
                conditions: savedConditions || [],
                value: ''
            };
            break;
        case 'MAPPED':
            mapping.mappedValues = { src: '', mappings: [] };
            break;
        case 'DEFAULTED':
            // Ensure source is initialized for DEFAULTED even if empty
            if (mapping.source === undefined) {
                mapping.source = '';
            }
            break;
    }
}

const handleConditionChange = (setIndex, condIndex, field, value) => {
    const newConditionSets = [...derivedMapping.conditionSets];

    // Create a deep copy of the condition to avoid mutating the original
    const updatedCondition = {
        ...newConditionSets[setIndex].conditions[condIndex],
        // Preserve additionalValues by default with a proper deep copy
        additionalValues: [...(newConditionSets[setIndex].conditions[condIndex].additionalValues || [])]
    };

    // Update the specified field
    updatedCondition[field] = value;

    // Update the condition in the set
    newConditionSets[setIndex].conditions[condIndex] = updatedCondition;

    // If in SOURCE mode and changing src field, also update result value to match
    if (newConditionSets[setIndex].outputFormat === 'SOURCE' && field === 'src') {
        newConditionSets[setIndex].value = value;
    }

    setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
};

function debugDerivedMapping(fieldNode, mapping) {
    console.log("DEBUG: Derived Mapping Extraction");
    console.log("------------------------------");

    // Log the XML structure
    const serializer = new XMLSerializer();
    console.log("XML Structure:", serializer.serializeToString(fieldNode));

    // Check for if/else structure
    const ifNodes = fieldNode.getElementsByTagName('if');
    if (ifNodes.length > 0) {
        console.log("Found IF nodes:", ifNodes.length);
        for (let i = 0; i < ifNodes.length; i++) {
            const ifNode = ifNodes[i];
            const andNode = ifNode.getElementsByTagName('and')[0];

            // Log direct children of if node
            console.log(`IF node ${i+1} direct children:`);
            for (let j = 0; j < ifNode.childNodes.length; j++) {
                const child = ifNode.childNodes[j];
                if (child.nodeType === 1) { // Element node
                    console.log(`- ${child.tagName}: ${child.textContent}`);
                }
            }

            // Log the value tag that should be the result
            const valueNodes = ifNode.getElementsByTagName('value');
            for (let j = 0; j < valueNodes.length; j++) {
                const node = valueNodes[j];
                const isInAnd = andNode && andNode.contains(node);
                console.log(`Value node ${j+1}: ${node.textContent} (inside AND: ${isInAnd})`);
            }
        }
    }

    // Log the final extracted mapping
    console.log("Extracted mapping:", mapping);
    console.log("First condition set value:", mapping.conditionSets[0]?.value);
    console.log("------------------------------");

    return mapping;
}

// Function to add to mappingTableDialog.js to help debug dialog rendering
function debugMappingDialogValues(data) {
    console.log("DEBUG: Mapping Dialog Values");
    console.log("------------------------------");
    console.log("Initial data:", data);

    if (data.conditionSets && data.conditionSets.length > 0) {
        data.conditionSets.forEach((set, index) => {
            console.log(`Condition Set ${index+1}:`);
            console.log("- Conditions:", set.conditions);
            console.log("- Result Value:", set.value);
            console.log("- Output Format:", set.outputFormat);
        });
    }

    console.log("Main value:", data.value);
    console.log("------------------------------");
}

// Make these functions available globally
window.handleAddRow = handleAddRow;
window.handleMappingDelete = handleMappingDelete;
window.handleMappingUpdate = handleMappingUpdate;
window.getCurrentMapping = () => currentMapping || [];

// Helper functions for condition processing
function isInsideCondition(node) {
    let parent = node.parentNode;
    while (parent && parent !== fieldNode) {
        if (parent.tagName === 'cond') {
            return true;
        }
        parent = parent.parentNode;
    }
    return false;
}

function processCondNode(condNode) {
    // Extract src, oper, and all value nodes
    const srcNodes = condNode.getElementsByTagName('src');
    const operNodes = condNode.getElementsByTagName('oper');
    const valueNodes = condNode.getElementsByTagName('value');

    const values = Array.from(valueNodes).map(node => node.textContent);

    return {
        src: srcNodes.length > 0 ? srcNodes[0].textContent : '',
        oper: operNodes.length > 0 ? operNodes[0].textContent : 'EQUALS',
        value: values.length > 0 ? values[0] : '',
        additionalValues: values.length > 1 ? values.slice(1) : []
    };
}

function processConditionSet(parentNode, andNode) {
    const conditions = [];
    const condNodes = andNode.getElementsByTagName('cond');

    // Process each condition node
    Array.from(condNodes).forEach(condNode => {
        conditions.push(processCondNode(condNode));
    });

    // Get result value (source or value tag)
    let resultValue = '';
    let outputFormat = 'VALUE';

    // Look for direct src or value tags that are children of the parent
    // and not inside the and block
    for (let i = 0; i < parentNode.childNodes.length; i++) {
        const node = parentNode.childNodes[i];
        if (node.nodeType === 1) {
            if (node.tagName === 'src' && node !== andNode && !andNode.contains(node)) {
                resultValue = node.textContent;
                outputFormat = 'SOURCE';
                break;
            } else if (node.tagName === 'value' && node !== andNode && !andNode.contains(node)) {
                resultValue = node.textContent;
                outputFormat = 'VALUE';
                break;
            }
        }
    }

    // Extract special tags
    const specialTags = extractSpecialTags(parentNode);

    return {
        conditions: conditions,
        value: resultValue,
        outputFormat: outputFormat,
        specialTags: specialTags
    };
}

function processOrNode(parentNode, orNode) {
    // This is for handling the complex OR structure
    const orConditions = [];

    // Process each AND node within the OR
    const andNodes = orNode.getElementsByTagName('and');
    Array.from(andNodes).forEach(andNode => {
        // Extract REF tags in each AND
        const refTags = extractRefTags(andNode);

        // Process conditions if any
        const condNodes = andNode.getElementsByTagName('cond');
        const conditions = Array.from(condNodes).map(processCondNode);

        orConditions.push({
            type: 'AND',
            conditions: conditions,
            refTags: refTags
        });
    });

    // Handle nvl tags if present
    const nvlNodes = orNode.getElementsByTagName('nvl');
    if (nvlNodes.length > 0) {
        const nvlData = Array.from(nvlNodes).map(nvlNode => {
            const srcNodes = nvlNode.getElementsByTagName('src');
            return {
                type: 'NVL',
                sources: Array.from(srcNodes).map(src => src.textContent)
            };
        });
        orConditions.push({
            type: 'NVL',
            data: nvlData
        });
    }

    // Find result value or source
    let resultValue = '';
    let outputFormat = 'VALUE';

    // Look for direct value or src tags after the OR structure
    for (let i = 0; i < parentNode.childNodes.length; i++) {
        const node = parentNode.childNodes[i];
        if (node.nodeType === 1) {
            if (node.tagName === 'src' && node !== orNode && !orNode.contains(node)) {
                resultValue = node.textContent;
                outputFormat = 'SOURCE';
                break;
            } else if (node.tagName === 'value' && node !== orNode && !orNode.contains(node)) {
                resultValue = node.textContent;
                outputFormat = 'VALUE';
                break;
            }
        }
    }

    return {
        orStructure: true,
        orConditions: orConditions,
        value: resultValue,
        outputFormat: outputFormat,
        specialTags: extractSpecialTags(parentNode, true) // Exclude those in orConditions
    };
}

function extractRefTags(node) {
    const refNodes = node.getElementsByTagName('ref');
    return Array.from(refNodes).map(refNode => ({
        type: 'REF',
        value: refNode.textContent
    }));
}

function extractSpecialTags(node, excludeChildren = false) {
    const specialTags = [];

    // Extract NVL tags
    const nvlNodes = node.getElementsByTagName('nvl');
    for (let i = 0; i < nvlNodes.length; i++) {
        const nvlNode = nvlNodes[i];

        // Only include if it's a direct child or we're not excluding children
        if (!excludeChildren || nvlNode.parentNode === node) {
            const srcNodes = nvlNode.getElementsByTagName('src');
            const srcValues = [];

            for (let j = 0; j < srcNodes.length; j++) {
                srcValues.push(srcNodes[j].textContent);
            }

            specialTags.push({
                type: 'NVL',
                sources: srcValues
            });
        }
    }

    // Extract REF tags
    const refNodes = node.getElementsByTagName('ref');
    for (let i = 0; i < refNodes.length; i++) {
        const refNode = refNodes[i];

        // Only include if it's a direct child or we're not excluding children
        if (!excludeChildren || refNode.parentNode === node) {
            specialTags.push({
                type: 'REF',
                value: refNode.textContent
            });
        }
    }

    return specialTags;
}

// Extract derived mapping data - UPDATED
function extractDerivedMapping(fieldNode) {
    console.log("Extracting derived mapping");

    const mapping = {
        conditions: [],
        value: '',
        conditionSets: [], // New structure for enhanced support
        specialTags: []    // Array to store NVL/REF tags
    };

    // First, check for direct NVL tags (outside ifelse) - These are standalone NVL tags
    const nvlNodes = fieldNode.getElementsByTagName('nvl');
    if (nvlNodes.length > 0) {
        console.log("Found NVL nodes:", nvlNodes.length);

        // Process each NVL node that's a direct child of the field
        for (let i = 0; i < nvlNodes.length; i++) {
            const nvlNode = nvlNodes[i];

            // Check if this NVL is a direct child of the field node (not inside ifelse or other structures)
            if (nvlNode.parentNode === fieldNode) {
                const srcNodes = nvlNode.getElementsByTagName('src');
                const srcValues = [];

                // Extract all source values from this NVL tag
                for (let j = 0; j < srcNodes.length; j++) {
                    srcValues.push(srcNodes[j].textContent);
                }

                // Add to special tags array
                mapping.specialTags.push({
                    type: 'NVL',
                    sources: srcValues
                });

                console.log("Added NVL tag with sources:", srcValues);
            }
        }
    }

    // Check for direct REF tags (outside ifelse)
    const refNodes = fieldNode.getElementsByTagName('ref');
    if (refNodes.length > 0) {
        for (let i = 0; i < refNodes.length; i++) {
            const refNode = refNodes[i];

            // Only add if it's a direct child of the field node (not inside if/else blocks)
            if (refNode.parentNode === fieldNode) {
                mapping.specialTags.push({
                    type: 'REF',
                    value: refNode.textContent
                });
                console.log("Added REF tag with value:", refNode.textContent);
            }
        }
    }

    // If we found standalone NVL/REF tags and no ifelse structure,
    // create a default condition set to hold them
    if (mapping.specialTags.length > 0 && !fieldNode.getElementsByTagName('ifelse')[0]) {
        mapping.conditionSets.push({
            conditions: [],
            value: '', // No result value needed for standalone NVL/REF
            outputFormat: 'VALUE',
            specialTags: mapping.specialTags // Attach special tags to the condition set
        });
        console.log("Created default condition set for standalone NVL/REF tags");
    }

    // Handle direct <src> tag outside of ifelse structures
    const directSrcNodes = Array.from(fieldNode.childNodes).filter(
        node => node.nodeType === 1 && node.tagName === 'src' && node.parentNode === fieldNode
    );
    if (directSrcNodes.length > 0) {
        mapping.directSrc = directSrcNodes[0].textContent;
    }

    // Check for ctable structure (like in Image 2)
    const ctableNode = fieldNode.getElementsByTagName('ctable')[0];
    if (ctableNode) {
        // This is actually a MAPPED type, but we'll extract it anyway for completeness
        // and handle it later
        const mappedValues = extractMappedValues(fieldNode);
        mapping.ctableData = mappedValues;
    }

    // Check for ifelse structure
    const ifElseNode = fieldNode.getElementsByTagName('ifelse')[0];
    if (ifElseNode) {
        // Get all if, else-if, and else nodes in order
        const ifNodes = Array.from(ifElseNode.getElementsByTagName('if'));
        const elseIfNodes = Array.from(ifElseNode.getElementsByTagName('else-if'));
        const elseNodes = Array.from(ifElseNode.getElementsByTagName('else'));

        // Handle if nodes
        ifNodes.forEach(ifNode => {
            // Check for and blocks
            const andNodes = ifNode.getElementsByTagName('and');
            if (andNodes.length > 0) {
                // Process and nodes
                Array.from(andNodes).forEach(andNode => {
                    const conditionSet = processConditionSet(ifNode, andNode);
                    mapping.conditionSets.push(conditionSet);
                    mapping.conditions.push(...conditionSet.conditions);
                });
            } else {
                // Check for or blocks
                const orNodes = ifNode.getElementsByTagName('or');
                if (orNodes.length > 0) {
                    // Process or nodes
                    Array.from(orNodes).forEach(orNode => {
                        const conditionSet = processOrNode(ifNode, orNode);
                        mapping.conditionSets.push(conditionSet);
                        mapping.conditions.push(...conditionSet.conditions);
                    });
                } else {
                    // Check for direct conditions without and/or
                    const condNodes = ifNode.getElementsByTagName('cond');
                    if (condNodes.length > 0) {
                        const conditions = [];
                        Array.from(condNodes).forEach(condNode => {
                            const condition = processCondNode(condNode);
                            conditions.push(condition);
                        });

                        // Get result value (source or value tag)
                        let resultValue = '';
                        let outputFormat = 'VALUE';

                        // Find the value or src tag outside the conditions
                        for (let i = 0; i < ifNode.childNodes.length; i++) {
                            const node = ifNode.childNodes[i];
                            if (node.nodeType === 1) { // Element node
                                if (node.tagName === 'value') {
                                    resultValue = node.textContent;
                                    outputFormat = 'VALUE';
                                    break;
                                } else if (node.tagName === 'src') {
                                    resultValue = node.textContent;
                                    outputFormat = 'SOURCE';
                                    break;
                                }
                            }
                        }

                        // Extract special tags for this if block
                        const ifSpecialTags = extractSpecialTags(ifNode);

                        // Add to condition sets (new format)
                        mapping.conditionSets.push({
                            conditions: conditions,
                            value: resultValue,
                            outputFormat: outputFormat,
                            specialTags: ifSpecialTags
                        });

                        mapping.conditions.push(...conditions);
                    }
                }
            }
        });

        // Process else-if nodes with similar logic
        elseIfNodes.forEach(elseIfNode => {
            const andNodes = elseIfNode.getElementsByTagName('and');
            if (andNodes.length > 0) {
                Array.from(andNodes).forEach(andNode => {
                    const conditionSet = processConditionSet(elseIfNode, andNode);
                    conditionSet.isElseIf = true; // Mark as else-if for correct XML generation
                    mapping.conditionSets.push(conditionSet);
                    mapping.conditions.push(...conditionSet.conditions);
                });
            } else {
                // Similar logic for other else-if patterns if needed
                const condNodes = elseIfNode.getElementsByTagName('cond');
                if (condNodes.length > 0) {
                    const conditions = [];
                    Array.from(condNodes).forEach(condNode => {
                        const condition = processCondNode(condNode);
                        conditions.push(condition);
                    });

                    // Get result value
                    let resultValue = '';
                    let outputFormat = 'VALUE';

                    for (let i = 0; i < elseIfNode.childNodes.length; i++) {
                        const node = elseIfNode.childNodes[i];
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'value') {
                                resultValue = node.textContent;
                                outputFormat = 'VALUE';
                                break;
                            } else if (node.tagName === 'src') {
                                resultValue = node.textContent;
                                outputFormat = 'SOURCE';
                                break;
                            }
                        }
                    }

                    // Add to condition sets
                    mapping.conditionSets.push({
                        conditions: conditions,
                        value: resultValue,
                        outputFormat: outputFormat,
                        isElseIf: true,
                        specialTags: extractSpecialTags(elseIfNode)
                    });

                    mapping.conditions.push(...conditions);
                }
            }
        });

        // Process else node
        if (elseNodes.length > 0) {
            elseNodes.forEach(elseNode => {
                let resultValue = '';
                let outputFormat = 'VALUE';

                // Check for src or value tags in else block
                const srcNodes = elseNode.getElementsByTagName('src');
                const valueNodes = elseNode.getElementsByTagName('value');

                if (srcNodes.length > 0) {
                    resultValue = srcNodes[0].textContent;
                    outputFormat = 'SOURCE';
                } else if (valueNodes.length > 0) {
                    resultValue = valueNodes[0].textContent;
                    outputFormat = 'VALUE';
                }

                // Add as condition set with empty conditions to indicate else
                mapping.conditionSets.push({
                    conditions: [],
                    value: resultValue,
                    outputFormat: outputFormat,
                    isElse: true,
                    specialTags: extractSpecialTags(elseNode)
                });
            });
        }
    }

    // For standalone NVL cases with no conditions and no ifelse, ensure we have a condition set
    if (mapping.conditionSets.length === 0 && mapping.specialTags.length > 0) {
        mapping.conditionSets.push({
            conditions: [],
            value: '',
            outputFormat: 'VALUE',
            specialTags: mapping.specialTags
        });
    }

    // If we can't identify a format, return a default structure
    if (mapping.conditionSets.length === 0) {
        return {
            conditions: [],
            value: '',
            conditionSets: [{
                conditions: [],
                value: '',
                outputFormat: 'VALUE', // Default to VALUE format instead of SOURCE
                specialTags: []
            }],
            specialTags: [],
            directSrc: mapping.directSrc
        };
    }

    return debugDerivedMapping(fieldNode, mapping);
}

// Extract MAPPED mapping data - UPDATED
function extractMappedValues(fieldNode) {
    console.log("Extracting mapped values");
    const ctableNode = fieldNode.getElementsByTagName('ctable')[0];
    if (!ctableNode) return null;

    const result = {
        src: [],
        mappings: []
    };

    // Extract all source columns
    const colsNode = ctableNode.getElementsByTagName('cols')[0];
    if (colsNode) {
        const srcNodes = colsNode.getElementsByTagName('src');
        if (srcNodes.length > 1) {
            // Multiple source columns
            result.src = Array.from(srcNodes).map(node => node.textContent);
        } else if (srcNodes.length === 1) {
            // Single source column (traditional format)
            result.src = srcNodes[0].textContent;
        }
    }

    // Extract all rows
    const rowNodes = ctableNode.getElementsByTagName('row');

    if (Array.isArray(result.src)) {
        // Multi-column format
        result.mappings = Array.from(rowNodes).map(row => {
            const valueNodes = row.getElementsByTagName('value');
            const values = Array.from(valueNodes).map(node => node.textContent);

            const mapping = {};
            result.src.forEach((src, idx) => {
                mapping[src] = values[idx] || '';
            });
            return mapping;
        });
    } else {
        // Traditional 2-column format
        result.mappings = Array.from(rowNodes)
            .map(row => {
                const values = row.getElementsByTagName('value');
                if (values.length >= 2) {
                    return {
                        from: values[0].textContent,
                        to: values.length > 2 ?
                            Array.from(values).slice(1).map(v => v.textContent) :
                            values[1].textContent
                    };
                }
                return null;
            })
            .filter(mapping => mapping !== null);
    }

    return result;
}

// Generate XML for derived mapping - UPDATED
function generateDerivedXml(derivedMapping) {
    if (!derivedMapping) return '';

    let xml = '';

    // Handle direct src tag
    if (derivedMapping.directSrc) {
        xml += `    <src>${escapeXml(derivedMapping.directSrc)}</src>\n`;
        return xml;
    }

    // Handle ctable structure
    if (derivedMapping.ctableData) {
        return generateMappedXml(derivedMapping.ctableData);
    }

    // Handle special tags (NVL/REF) that are standalone (not in ifelse)
    if (derivedMapping.specialTags && derivedMapping.specialTags.length > 0 &&
        !derivedMapping.conditionSets.some(set => set.conditions.length > 0)) {
        derivedMapping.specialTags.forEach(tag => {
            if (tag.type === 'NVL') {
                xml += '    <nvl>\n';
                tag.sources.forEach(src => {
                    xml += `      <src>${escapeXml(src)}</src>\n`;
                });
                xml += '    </nvl>\n';
            } else if (tag.type === 'REF') {
                xml += `    <ref>${escapeXml(tag.value)}</ref>\n`;
            }
        });

        return xml;
    }

    // If we have multiple condition sets, use the ifelse format
    if (derivedMapping.conditionSets && derivedMapping.conditionSets.length > 0) {
        // Check if we're using a complex structure
        const hasOr = derivedMapping.conditionSets.some(set => set.orStructure);
        const hasElseIf = derivedMapping.conditionSets.some(set => set.isElseIf);
        const hasElse = derivedMapping.conditionSets.some(set => set.isElse);

        xml += '    <ifelse>\n';

        // Do we have a complex OR structure?
        if (hasOr) {
            const orSet = derivedMapping.conditionSets.find(set => set.orStructure);
            if (orSet) {
                xml += '      <if>\n';

                // Add OR block
                xml += '        <or>\n';

                // Process each part in OR structure
                if (orSet.orConditions) {
                    orSet.orConditions.forEach(orCond => {
                        if (orCond.type === 'AND') {
                            xml += '          <and>\n';

                            // Add ref tags if any
                            if (orCond.refTags && orCond.refTags.length > 0) {
                                orCond.refTags.forEach(ref => {
                                    xml += `            <ref>${escapeXml(ref.value)}</ref>\n`;
                                });
                            }

                            // Add conditions
                            if (orCond.conditions && orCond.conditions.length > 0) {
                                orCond.conditions.forEach(condition => {
                                    xml += '            <cond>\n';
                                    xml += `              <src>${escapeXml(condition.src)}</src>\n`;
                                    xml += `              <oper>${escapeXml(condition.oper)}</oper>\n`;
                                    xml += `              <value>${escapeXml(condition.value)}</value>\n`;

                                    // Add additional values
                                    if (condition.additionalValues && condition.additionalValues.length > 0) {
                                        condition.additionalValues.forEach(val => {
                                            if (val && val.trim()) {
                                                xml += `              <value>${escapeXml(val)}</value>\n`;
                                            }
                                        });
                                    }

                                    xml += '            </cond>\n';
                                });
                            }

                            xml += '          </and>\n';
                        } else if (orCond.type === 'NVL') {
                            // Add NVL blocks
                            orCond.data.forEach(nvl => {
                                xml += '          <nvl>\n';
                                nvl.sources.forEach(src => {
                                    xml += `            <src>${escapeXml(src)}</src>\n`;
                                });
                                xml += '          </nvl>\n';
                            });
                        }
                    });
                }

                xml += '        </or>\n';

                // Add the result value
                if (orSet.outputFormat === 'SOURCE') {
                    xml += `        <src>${escapeXml(orSet.value)}</src>\n`;
                } else {
                    xml += `        <value>${escapeXml(orSet.value)}</value>\n`;
                }

                xml += '      </if>\n';

                // Add else part if it exists
                const elseSet = derivedMapping.conditionSets.find(set => set.isElse);
                if (elseSet) {
                    xml += '      <else>\n';
                    if (elseSet.outputFormat === 'SOURCE') {
                        xml += `        <src>${escapeXml(elseSet.value)}</src>\n`;
                    } else {
                        xml += `        <value>${escapeXml(elseSet.value)}</value>\n`;
                    }
                    xml += '      </else>\n';
                }
            }
        }
        // Do we have an if/else-if/else structure?
        else if (hasElseIf || hasElse) {
            // Find all if, else-if, and else sets
            const ifSets = derivedMapping.conditionSets.filter(set => !set.isElseIf && !set.isElse);
            const elseIfSets = derivedMapping.conditionSets.filter(set => set.isElseIf);
            const elseSets = derivedMapping.conditionSets.filter(set => set.isElse);

            // Generate if part
            if (ifSets.length > 0) {
                xml += '      <if>\n';

                // Add special tags
                if (ifSets[0].specialTags && ifSets[0].specialTags.length > 0) {
                    ifSets[0].specialTags.forEach(tag => {
                        if (tag.type === 'NVL') {
                            xml += '        <nvl>\n';
                            tag.sources.forEach(src => {
                                xml += `          <src>${escapeXml(src)}</src>\n`;
                            });
                            xml += '        </nvl>\n';
                        } else if (tag.type === 'REF') {
                            xml += `        <ref>${escapeXml(tag.value)}</ref>\n`;
                        }
                    });
                }

                // Add AND block with conditions
                if (ifSets[0].conditions && ifSets[0].conditions.length > 0) {
                    xml += '        <and>\n';
                    ifSets[0].conditions.forEach(condition => {
                        xml += '          <cond>\n';
                        xml += `            <src>${escapeXml(condition.src)}</src>\n`;
                        xml += `            <oper>${escapeXml(condition.oper)}</oper>\n`;
                        xml += `            <value>${escapeXml(condition.value)}</value>\n`;

                        // Add additional values
                        if (condition.additionalValues && condition.additionalValues.length > 0) {
                            condition.additionalValues.forEach(val => {
                                if (val && val.trim()) {
                                    xml += `            <value>${escapeXml(val)}</value>\n`;
                                }
                            });
                        }

                        xml += '          </cond>\n';
                    });
                    xml += '        </and>\n';
                }

                // Add result value
                if (ifSets[0].outputFormat === 'SOURCE') {
                    xml += `        <src>${escapeXml(ifSets[0].value)}</src>\n`;
                } else {
                    xml += `        <value>${escapeXml(ifSets[0].value)}</value>\n`;
                }

                xml += '      </if>\n';
            }

            // Generate else-if parts
            elseIfSets.forEach(set => {
                xml += '      <else-if>\n';

                // Add special tags
                if (set.specialTags && set.specialTags.length > 0) {
                    set.specialTags.forEach(tag => {
                        if (tag.type === 'NVL') {
                            xml += '        <nvl>\n';
                            tag.sources.forEach(src => {
                                xml += `          <src>${escapeXml(src)}</src>\n`;
                            });
                            xml += '        </nvl>\n';
                        } else if (tag.type === 'REF') {
                            xml += `        <ref>${escapeXml(tag.value)}</ref>\n`;
                        }
                    });
                }

                // Add AND block with conditions
                if (set.conditions && set.conditions.length > 0) {
                    xml += '        <and>\n';
                    set.conditions.forEach(condition => {
                        xml += '          <cond>\n';
                        xml += `            <src>${escapeXml(condition.src)}</src>\n`;
                        xml += `            <oper>${escapeXml(condition.oper)}</oper>\n`;
                        xml += `            <value>${escapeXml(condition.value)}</value>\n`;

                        // Add additional values
                        if (condition.additionalValues && condition.additionalValues.length > 0) {
                            condition.additionalValues.forEach(val => {
                                if (val && val.trim()) {
                                    xml += `            <value>${escapeXml(val)}</value>\n`;
                                }
                            });
                        }

                        xml += '          </cond>\n';
                    });
                    xml += '        </and>\n';
                }

                // Add result value
                if (set.outputFormat === 'SOURCE') {
                    xml += `        <src>${escapeXml(set.value)}</src>\n`;
                } else {
                    xml += `        <value>${escapeXml(set.value)}</value>\n`;
                }

                xml += '      </else-if>\n';
            });

            // Generate else part
            if (elseSets.length > 0) {
                xml += '      <else>\n';

                // Add special tags for else
                if (elseSets[0].specialTags && elseSets[0].specialTags.length > 0) {
                    elseSets[0].specialTags.forEach(tag => {
                        if (tag.type === 'NVL') {
                            xml += '        <nvl>\n';
                            tag.sources.forEach(src => {
                                xml += `          <src>${escapeXml(src)}</src>\n`;
                            });
                            xml += '        </nvl>\n';
                        } else if (tag.type === 'REF') {
                            xml += `        <ref>${escapeXml(tag.value)}</ref>\n`;
                        }
                    });
                }

                if (elseSets[0].outputFormat === 'SOURCE') {
                    xml += `        <src>${escapeXml(elseSets[0].value)}</src>\n`;
                } else {
                    xml += `        <value>${escapeXml(elseSets[0].value)}</value>\n`;
                }
                xml += '      </else>\n';
            }
        }
        // Simple if structure
        else {
            let isFirstConditionSet = true;
            derivedMapping.conditionSets.forEach(conditionSet => {
                if (conditionSet.conditions.length > 0) {
                    // Use <if> for all condition sets
                    xml += '      <if>\n';

                    // Add special tags
                    if (conditionSet.specialTags && conditionSet.specialTags.length > 0) {
                        conditionSet.specialTags.forEach(tag => {
                            if (tag.type === 'NVL') {
                                xml += '        <nvl>\n';
                                tag.sources.forEach(src => {
                                    xml += `          <src>${escapeXml(src)}</src>\n`;
                                });
                                xml += '        </nvl>\n';
                            } else if (tag.type === 'REF') {
                                xml += `        <ref>${escapeXml(tag.value)}</ref>\n`;
                            }
                        });
                    }

                    // Generate and block with conditions
                    xml += '        <and>\n';
                    conditionSet.conditions.forEach(condition => {
                        xml += '          <cond>\n';
                        xml += `            <src>${escapeXml(condition.src)}</src>\n`;
                        xml += `            <oper>${escapeXml(condition.oper)}</oper>\n`;

                        // Output primary value
                        xml += `            <value>${escapeXml(condition.value)}</value>\n`;

                        // Output additional values
                        if (condition.additionalValues && condition.additionalValues.length > 0) {
                            condition.additionalValues.forEach(val => {
                                if (val && val.trim()) {
                                    xml += `            <value>${escapeXml(val)}</value>\n`;
                                }
                            });
                        }

                        xml += '          </cond>\n';
                    });
                    xml += '        </and>\n';

                    // Add result using src or value tag based on output format
                    if (conditionSet.outputFormat === 'SOURCE') {
                        xml += `        <src>${escapeXml(conditionSet.value)}</src>\n`;
                    } else {
                        xml += `        <value>${escapeXml(conditionSet.value)}</value>\n`;
                    }

                    xml += '      </if>\n';
                    isFirstConditionSet = false;
                }
            });

            // Find default set for else condition
            const defaultSet = derivedMapping.conditionSets.find(set => set.conditions.length === 0);
            if (defaultSet) {
                xml += '      <else>\n';
                // Add special tags for else
                if (defaultSet.specialTags && defaultSet.specialTags.length > 0) {
                    defaultSet.specialTags.forEach(tag => {
                        if (tag.type === 'NVL') {
                            xml += '        <nvl>\n';
                            tag.sources.forEach(src => {
                                xml += `          <src>${escapeXml(src)}</src>\n`;
                            });
                            xml += '        </nvl>\n';
                        } else if (tag.type === 'REF') {
                            xml += `        <ref>${escapeXml(tag.value)}</ref>\n`;
                        }
                    });
                }

                if (defaultSet.outputFormat === 'SOURCE') {
                    xml += `        <src>${escapeXml(defaultSet.value)}</src>\n`;
                } else {
                    xml += `        <value>${escapeXml(defaultSet.value)}</value>\n`;
                }
                xml += '      </else>\n';
            }
        }

        xml += '    </ifelse>\n';
    }
    // Fallback to a simpler format if needed
    else if (derivedMapping.conditions && derivedMapping.conditions.length > 0) {
        // Default to VALUE format unless explicitly set otherwise
        const isSourceFormat = derivedMapping.outputFormat === 'SOURCE';

        xml += '    <ifelse>\n';
        xml += '      <if>\n';

        // Add any special tags (NVL/REF) if they exist
        if (derivedMapping.specialTags && derivedMapping.specialTags.length > 0) {
            derivedMapping.specialTags.forEach(tag => {
                if (tag.type === 'NVL') {
                    xml += '        <nvl>\n';
                    tag.sources.forEach(src => {
                        xml += `          <src>${escapeXml(src)}</src>\n`;
                    });
                    xml += '        </nvl>\n';
                } else if (tag.type === 'REF') {
                    xml += `        <ref>${escapeXml(tag.value)}</ref>\n`;
                }
            });
        }

        xml += '        <and>\n';

        // Generate condition nodes
        derivedMapping.conditions.forEach(condition => {
            xml += '          <cond>\n';
            xml += `            <src>${escapeXml(condition.src)}</src>\n`;
            xml += `            <oper>${escapeXml(condition.oper)}</oper>\n`;
            xml += `            <value>${escapeXml(condition.value)}</value>\n`;

            // Output any additional values
            if (condition.additionalValues && condition.additionalValues.length > 0) {
                condition.additionalValues.forEach(val => {
                    if (val && val.trim()) {
                        xml += `            <value>${escapeXml(val)}</value>\n`;
                    }
                });
            }

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

// Generate XML for mapped values - UPDATED
function generateMappedXml(mappedValues) {
    if (!mappedValues) return '';

    let xml = '    <ctable>\n';

    // Generate cols section
    xml += '      <cols>\n';
    if (Array.isArray(mappedValues.src)) {
        // Multiple source columns
        mappedValues.src.forEach(src => {
            xml += `        <src>${escapeXml(src)}</src>\n`;
        });
    } else {
        // Single source column
        xml += `        <src>${escapeXml(mappedValues.src)}</src>\n`;
    }
    xml += '      </cols>\n';

    // Generate rows
    mappedValues.mappings.forEach(mapping => {
        xml += '      <row>\n';

        if (Array.isArray(mappedValues.src) && mappedValues.src.length > 1) {
            // Multiple columns format
            mappedValues.src.forEach(src => {
                const value = mapping[src] || '';
                xml += `        <value>${escapeXml(value)}</value>\n`;
            });
        } else {
            // Standard two-column format
            xml += `        <value>${escapeXml(mapping.from)}</value>\n`;

            if (Array.isArray(mapping.to)) {
                // Multiple to values
                mapping.to.forEach(toValue => {
                    xml += `        <value>${escapeXml(toValue)}</value>\n`;
                });
            } else {
                // Single to value
                xml += `        <value>${escapeXml(mapping.to)}</value>\n`;
            }
        }

        xml += '      </row>\n';
    });

    xml += '    </ctable>\n';
    return xml;
}

// Parse and display mapping
function parseAndDisplayMapping(xmlString) {
    try {
        console.log("Parsing XML string - length:", xmlString.length);
        originalXmlStructure = xmlString;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            throw new Error('XML parsing failed');
        }

        // Extract XML comments before parsing the fields
        const comments = extractComments(xmlString);

        // Debug some sample field nodes before extraction
        const sampleFields = xmlDoc.getElementsByTagName('field');
        if (sampleFields.length > 0) {
            // Look for fields with NVL tags to debug
            for (let i = 0; i < Math.min(5, sampleFields.length); i++) {
                const field = sampleFields[i];
                const destNode = field.getElementsByTagName('dest')[0];
                const fieldName = destNode ? destNode.textContent : `Field ${i+1}`;

                // Check if this field has NVL tags
                const nvlNodes = field.getElementsByTagName('nvl');
                if (nvlNodes.length > 0) {
                    console.log(`Found field with NVL tags: ${fieldName}`);
                    debugLogFieldStructure(field);
                }
            }
        }

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

// Extract mapping data from XML with improved NVL handling
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
            comments: [], // Array to store comments
            originalIndex: i // Store the original position in the XML
        };

        // Debug log structure for fields with NVL tags
        const nvlNodes = fieldNode.getElementsByTagName('nvl');
        if (nvlNodes.length > 0) {
            const destNode = fieldNode.getElementsByTagName('dest')[0];
            const fieldName = destNode ? destNode.textContent : `Field ${i+1}`;
            console.log(`Processing field with NVL tags: ${fieldName}`);

            // Check if NVL tags are direct children of the field
            for (let j = 0; j < nvlNodes.length; j++) {
                const nvlNode = nvlNodes[j];
                if (nvlNode.parentNode === fieldNode) {
                    console.log(`  NVL tag ${j+1} is direct child of field`);

                    // Log the source tags
                    const srcNodes = nvlNode.getElementsByTagName('src');
                    for (let k = 0; k < srcNodes.length; k++) {
                        console.log(`    Source ${k+1}: ${srcNodes[k].textContent}`);
                    }
                }
            }
        }

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
            case 'DEFAULTED':
                const srcNode = fieldNode.getElementsByTagName('src')[0];
                mapping.source = srcNode ? srcNode.textContent : '';
                break;
            case 'DERIVED':
                const derivedResult = extractDerivedMapping(fieldNode);

                // Print debug info for NVL tags
                if (derivedResult.specialTags && derivedResult.specialTags.length > 0) {
                    console.log(`Field ${mapping.fieldName} has ${derivedResult.specialTags.length} special tags:`);
                    derivedResult.specialTags.forEach((tag, idx) => {
                        if (tag.type === 'NVL') {
                            console.log(`- NVL tag ${idx+1} with sources: ${tag.sources.join(', ')}`);
                        } else if (tag.type === 'REF') {
                            console.log(`- REF tag ${idx+1} with value: ${tag.value}`);
                        }
                    });
                }

                mapping.derivedMapping = derivedResult;

                // Add special debugValidation flag for testing
                mapping.debugValidation = {
                    hasNvl: Boolean(nvlNodes.length),
                    nvlCount: nvlNodes.length,
                    extractedTags: derivedResult.specialTags ? derivedResult.specialTags.length : 0
                };
                break;
            case 'MAPPED':
                mapping.mappedValues = extractMappedValues(fieldNode);
                break;
        }

        mappings.push(mapping);

        // Debug log for NVL fields
        if (mapping.mappingType === 'DERIVED' && mapping.derivedMapping &&
            mapping.derivedMapping.specialTags && mapping.derivedMapping.specialTags.length > 0) {
            console.log(`Extracted mapping for ${mapping.fieldName}:`);
            console.log(`- Special Tags: ${mapping.derivedMapping.specialTags.length}`);
            console.log(`- Condition Sets: ${mapping.derivedMapping.conditionSets.length}`);

            // Check if special tags were properly added to condition sets
            if (mapping.derivedMapping.conditionSets.length > 0) {
                mapping.derivedMapping.conditionSets.forEach((set, idx) => {
                    const setTags = set.specialTags?.length || 0;
                    console.log(`  Condition Set ${idx+1}: ${setTags} special tags`);
                });
            }
        }
    }

    // Do not sort by default, preserve the original order
    return mappings;
}

// Helper function to debug field structure
function debugLogFieldStructure(fieldNode) {
    console.log("--- DEBUG: Field Structure ---");

    // Log basic field info
    const destNode = fieldNode.getElementsByTagName('dest')[0];
    console.log("Field: " + (destNode ? destNode.textContent : "unknown"));

    // Check for mapping type
    const mappingTypeNode = fieldNode.getElementsByTagName('mapping-type')[0];
    console.log("Mapping Type: " + (mappingTypeNode ? mappingTypeNode.textContent : "unknown"));

    // Log direct children to see the structure
    console.log("Direct Children:");
    for (let i = 0; i < fieldNode.childNodes.length; i++) {
        const node = fieldNode.childNodes[i];
        if (node.nodeType === 1) { // Element node
            console.log(`- ${node.tagName}`);
        }
    }

    // Check specifically for NVL tags
    const nvlNodes = fieldNode.getElementsByTagName('nvl');
    console.log(`NVL Tags: ${nvlNodes.length}`);

    for (let i = 0; i < nvlNodes.length; i++) {
        const nvlNode = nvlNodes[i];
        console.log(`  NVL Tag ${i+1}:`);

        // Check if it's a direct child of the field
        const isDirectChild = nvlNode.parentNode === fieldNode;
        console.log(`  - Direct child of field: ${isDirectChild}`);

        // Count source tags
        const srcNodes = nvlNode.getElementsByTagName('src');
        console.log(`  - Source tags: ${srcNodes.length}`);

        // Log each source
        for (let j = 0; j < srcNodes.length; j++) {
            console.log(`    - Source ${j+1}: ${srcNodes[j].textContent}`);
        }
    }

    // Check for ifelse structure
    const ifElseNode = fieldNode.getElementsByTagName('ifelse')[0];
    if (ifElseNode) {
        console.log("Has ifelse structure: Yes");
    } else {
        console.log("Has ifelse structure: No");
    }

    console.log("---------------------------");
}

// Generate XML for saving
function generateXml(mappingsToUse) {
    console.log("Generating XML");
    // Use provided mappings or fall back to current mapping
    const mappingsArray = mappingsToUse || currentMapping;
    if (!mappingsArray) return null;

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
    mappingsArray.forEach(mapping => {
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

    // Use the special dest generator for fields with attributes
    if (mapping.fieldName && mapping.fieldName.includes('[')) {
        xml += generateDestWithAttributes(mapping.fieldName);
    } else {
        xml += `    <dest>${escapeXml(mapping.fieldName)}</dest>\n`;
    }

    // Preserve any comment that might exist in the original XML
    if (mapping.comments && mapping.comments.length > 0) {
        mapping.comments.forEach(comment => {
            xml += `    ${comment}\n`;
        });
    }

    xml += `    <mapping-type>${escapeXml(mapping.mappingType)}</mapping-type>\n`;

    switch (mapping.mappingType) {
        case 'PASSED_THROUGH':
        case 'DEFAULTED': // Add DEFAULTED to handle source tags
            if (mapping.source !== undefined) { // Check if source exists, even if it's empty
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

    // First add status (CHANGED ORDER - status comes before notes)
    xml += `    <status>${escapeXml(mapping.status)}</status>\n`;

    // Then add notes (CHANGED ORDER - notes comes after status)
    if (mapping.notes) {
        xml += `    <notes>${escapeXml(mapping.notes)}</notes>\n`;
    }

    // Add tickets with <tickets> wrapper tags
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

// Escape XML special characters
function escapeXml(unsafe) {
    if (!unsafe) return '';

    // First check if this is an attribute value that already contains &quot;
    // We want to avoid double-escaping
    if (unsafe.includes('&quot;')) {
        // This is already escaped, return as is
        return unsafe;
    }

    // For field values that contain actual quotes ("), we need to properly handle them
    // instead of converting them to &quot;
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '"') // Don't escape double quotes in attribute values
        .replace(/'/g, '\''); // Don't escape single quotes
}

// For attribute values specifically, we need a separate function
function escapeXmlAttribute(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '"') // Don't escape quotes in attribute values
        .replace(/'/g, '\''); // Don't escape single quotes
}

// Use this function when handling dest attributes with quotes
function generateDestWithAttributes(fieldName) {
    // Check if the field contains attribute syntax (@Field[attr="value"])
    const attrMatch = fieldName.match(/@(\w+)\[(.*?)\]/);
    if (attrMatch) {
        const baseField = attrMatch[1];
        const attrString = attrMatch[2];

        // Preserve the attribute string exactly as is, without escaping quotes
        return `    <dest>@${baseField}[${attrString}]</dest>\n`;
    }

    // If no attributes, just escape normally
    return `    <dest>${escapeXml(fieldName)}</dest>\n`;
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
        // Create a copy of the current mapping to avoid modifying the original
        let mappingsToSave = [...currentMapping];

        // If preference is alphabetical, sort the mapping
        if (preference === 'alphabetical') {
            mappingsToSave.sort((a, b) => a.fieldName.toLowerCase().localeCompare(b.fieldName.toLowerCase()));
            console.log("Sorted mapping alphabetically");
        } else {
            // If original order preference, sort by the originalIndex property we added
            mappingsToSave.sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0));
            console.log("Preserving original field order");
        }

        // We'll use this sorted mapping just for generating XML
        const xmlContent = generateXml(mappingsToSave);
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