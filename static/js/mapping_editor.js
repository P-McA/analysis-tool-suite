// Disable Dropzone auto discover
Dropzone.autoDiscover = false;

document.addEventListener('DOMContentLoaded', function() {
    let currentMapping = null;
    let originalXmlStructure = null;

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

    // Initialize dropzone
    const dropzone = new Dropzone("#xmlDropzone", {
        url: "/upload_mapping",
        autoProcessQueue: false,
        maxFiles: 1,
        acceptedFiles: ".xml",
        addRemoveLinks: true,
        createImageThumbnails: false
    });

    // Handle file addition
    dropzone.on("addedfile", function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                parseAndDisplayMapping(e.target.result);
            } catch (error) {
                alert('Error parsing XML file: ' + error.message);
            }
        };
        reader.readAsText(file);
    });

    // Parse XML and display in editor
    function parseAndDisplayMapping(xmlString) {
        originalXmlStructure = xmlString;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        currentMapping = extractMappingData(xmlDoc);
        document.getElementById('editorSection').classList.remove('d-none');
        populateTable(currentMapping);
    }

    // Extract mapping data from XML
    function extractMappingData(xmlDoc) {
        const mappings = [];
        const fieldNodes = xmlDoc.getElementsByTagName('field');

        for (let i = 0; i < fieldNodes.length; i++) {
            const fieldNode = fieldNodes[i];

            // Get the raw content of dest tag
            const destMatch = new XMLSerializer()
                .serializeToString(fieldNode)
                .match(/<dest>([\s\S]*?)<\/dest>/);

            const fieldName = destMatch ? destMatch[1] : '';

            // Get other nodes content
            const mappingTypeNode = fieldNode.getElementsByTagName('mapping-type')[0];
            const notesNode = fieldNode.getElementsByTagName('notes')[0];
            const jiraNode = fieldNode.getElementsByTagName('jira')[0];

            // Get mapping type
            const mappingType = mappingTypeNode ? mappingTypeNode.textContent : 'NONE';

            // Get source content based on mapping type
            let source = '';
            if (mappingType === 'PASSED_THROUGH') {
                const srcMatch = new XMLSerializer()
                    .serializeToString(fieldNode)
                    .match(/<src>([\s\S]*?)<\/src>/);
                source = srcMatch ? srcMatch[1] : '';
            }

            mappings.push({
                fieldName: fieldName,
                source: source,
                mappingType: mappingType,
                notes: notesNode ? notesNode.textContent : '',
                tickets: jiraNode ? jiraNode.textContent : ''
            });
        }

        // Sort mappings alphabetically by fieldName
        mappings.sort((a, b) => {
            if (!a.fieldName) return 1;
            if (!b.fieldName) return -1;
            return a.fieldName.localeCompare(b.fieldName);
        });

        return mappings;
    }

    // Populate table with mapping data
    function populateTable(mappings) {
        const tbody = document.getElementById('mappingTableBody');
        tbody.innerHTML = '';

        mappings.forEach((mapping, index) => {
            const row = createTableRow(mapping, index);
            tbody.appendChild(row);
        });
    }

    // Create table row for mapping
    function createTableRow(mapping, index) {
        const row = document.createElement('tr');

        // Number cell
        const numberCell = document.createElement('td');
        numberCell.className = 'text-center';
        numberCell.textContent = index + 1;
        row.appendChild(numberCell);

        // Field Name cell
        const fieldNameCell = document.createElement('td');
        const fieldNameInput = document.createElement('input');
        fieldNameInput.type = 'text';
        fieldNameInput.className = 'form-control font-monospace';
        fieldNameInput.value = mapping.fieldName;
        fieldNameInput.dataset.field = 'fieldName';
        fieldNameInput.dataset.index = index;
        fieldNameCell.appendChild(fieldNameInput);
        row.appendChild(fieldNameCell);

        // Source cell
        const sourceCell = document.createElement('td');
        const sourceInput = document.createElement('input');
        sourceInput.type = 'text';
        sourceInput.className = 'form-control';
        sourceInput.value = mapping.source;
        sourceInput.dataset.field = 'source';
        sourceInput.dataset.index = index;
        sourceCell.appendChild(sourceInput);
        row.appendChild(sourceCell);

        // Mapping Type cell
        const mappingTypeCell = document.createElement('td');
        const mappingTypeSelect = document.createElement('select');
        mappingTypeSelect.className = 'form-select';
        mappingTypeSelect.dataset.field = 'mappingType';
        mappingTypeSelect.dataset.index = index;
        MAPPING_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            if (mapping.mappingType === type) {
                option.selected = true;
            }
            mappingTypeSelect.appendChild(option);
        });
        mappingTypeCell.appendChild(mappingTypeSelect);
        row.appendChild(mappingTypeCell);

        // Notes cell
        const notesCell = document.createElement('td');
        const notesTextarea = document.createElement('textarea');
        notesTextarea.className = 'form-control';
        notesTextarea.value = mapping.notes;
        notesTextarea.dataset.field = 'notes';
        notesTextarea.dataset.index = index;
        notesTextarea.rows = 2;
        notesCell.appendChild(notesTextarea);
        row.appendChild(notesCell);

        // Tickets cell
        const ticketsCell = document.createElement('td');
        const ticketsInput = document.createElement('input');
        ticketsInput.type = 'text';
        ticketsInput.className = 'form-control';
        ticketsInput.value = mapping.tickets;
        ticketsInput.dataset.field = 'tickets';
        ticketsInput.dataset.index = index;
        ticketsCell.appendChild(ticketsInput);
        row.appendChild(ticketsCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'text-center';
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger btn-sm';
        deleteButton.textContent = 'Delete';
        deleteButton.onclick = () => deleteRow(index);
        actionsCell.appendChild(deleteButton);
        row.appendChild(actionsCell);

        // Add event listeners for input changes
        row.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('change', handleInputChange);
        });

        return row;
    }

    // Handle input changes
    function handleInputChange(event) {
        const field = event.target.dataset.field;
        const index = parseInt(event.target.dataset.index);
        const value = event.target.value;

        // Update the specific field in the mapping
        currentMapping[index][field] = value;

        // If changing mapping type to non-PASSED_THROUGH, clear the source
        if (field === 'mappingType' && value !== 'PASSED_THROUGH') {
            currentMapping[index].source = '';
            // Update the source input field in the UI
            const sourceInput = event.target.parentNode.parentNode.querySelector('[data-field="source"]');
            if (sourceInput) {
                sourceInput.value = '';
            }
        }
    }

    // Add new row
    document.getElementById('addRowBtn').addEventListener('click', function() {
        const newMapping = {
            fieldName: '',
            source: '',
            mappingType: 'NONE',
            notes: '',
            tickets: ''
        };

        // Add new mapping to the beginning of the array
        currentMapping.unshift(newMapping);

        // Repopulate the entire table
        populateTable(currentMapping);

        // Optional: Scroll to top to ensure new row is visible
        window.scrollTo(0, 0);
    });

    // Delete row
    window.deleteRow = function(index) {
        if (confirm('Are you sure you want to delete this mapping?')) {
            currentMapping.splice(index, 1);
            populateTable(currentMapping);
        }
    };

    // Save changes
    document.getElementById('saveChangesBtn').addEventListener('click', function() {
        if (!currentMapping) {
            alert('No mapping data to save');
            return;
        }

        const xmlContent = generateXML(currentMapping);
        downloadXML(xmlContent);
    });

    // Generate XML based on original structure
    function generateXML(mappings) {
        if (!originalXmlStructure) {
            return generateDefaultXML(mappings);
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(originalXmlStructure, "text/xml");
        const fieldNodes = xmlDoc.getElementsByTagName('field');

        // Create a map of field names to their new values
        const updatedFieldsMap = new Map(
            mappings.map(mapping => [mapping.fieldName, mapping])
        );

        // Update each field in the original XML
        for (let i = 0; i < fieldNodes.length; i++) {
            const fieldNode = fieldNodes[i];
            const destNode = fieldNode.getElementsByTagName('dest')[0];
            const fieldName = destNode ? destNode.textContent : '';

            const updatedField = updatedFieldsMap.get(fieldName);
            if (updatedField) {
                updateFieldNode(fieldNode, updatedField);
            }
        }

        // Add any new fields at the end
        const existingFields = new Set(Array.from(fieldNodes).map(node =>
            node.getElementsByTagName('dest')[0]?.textContent
        ));

        mappings.forEach(mapping => {
            if (!existingFields.has(mapping.fieldName)) {
                const newField = createNewFieldNode(xmlDoc, mapping);
                xmlDoc.documentElement.appendChild(newField);
            }
        });

        return new XMLSerializer().serializeToString(xmlDoc);
    }

    function updateFieldNode(fieldNode, updatedField) {
        // Update only specific tags if they exist
        const updateTags = {
            'src': updatedField.source,
            'mapping-type': updatedField.mappingType,
            'notes': updatedField.notes,
            'jira': updatedField.tickets
        };

        Object.entries(updateTags).forEach(([tagName, value]) => {
            const node = fieldNode.getElementsByTagName(tagName)[0];
            if (node && value !== undefined) {
                node.textContent = value;
            }
        });
    }

    function createNewFieldNode(xmlDoc, mapping) {
        const fieldNode = xmlDoc.createElement('field');
        const tags = {
            'dest': mapping.fieldName,
            'src': mapping.source,
            'mapping-type': mapping.mappingType,
            'notes': mapping.notes,
            'jira': mapping.tickets
        };

        Object.entries(tags).forEach(([tagName, value]) => {
            if (value) {
                const node = xmlDoc.createElement(tagName);
                node.textContent = value;
                fieldNode.appendChild(node);
            }
        });

        return fieldNode;
    }

    // Fallback XML generation if original structure is not available
    function generateDefaultXML(mappings) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<mappings>\n';
        mappings.forEach(mapping => {
            xml += '  <field>\n';
            xml += `    <dest>${mapping.fieldName}</dest>\n`;
            if (mapping.source) xml += `    <src>${mapping.source}</src>\n`;
            xml += `    <mapping-type>${mapping.mappingType}</mapping-type>\n`;
            if (mapping.notes) xml += `    <notes>${mapping.notes}</notes>\n`;
            if (mapping.tickets) xml += `    <jira>${mapping.tickets}</jira>\n`;
            xml += '  </field>\n';
        });
        xml += '</mappings>';
        return xml;
    }

    // Download XML file
    function downloadXML(xmlContent) {
        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mapping.xml';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }
});