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
            const destMatch = new XMLSerializer()
                .serializeToString(fieldNode)
                .match(/<dest>([\s\S]*?)<\/dest>/);
            const fieldName = destMatch ? destMatch[1] : '';

            const mappingTypeNode = fieldNode.getElementsByTagName('mapping-type')[0];
            const notesNode = fieldNode.getElementsByTagName('notes')[0];
            const jiraNodes = fieldNode.getElementsByTagName('jira');
            const tickets = Array.from(jiraNodes).map(node => node.textContent).join('\n');

            const mappingType = mappingTypeNode ? mappingTypeNode.textContent : 'NONE';

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
                tickets: tickets
            });
        }

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

        // Tickets cell with tag display
        const ticketsCell = createTicketsCell(mapping, index);
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
            if (input.dataset.field !== 'tickets') {
                input.addEventListener('change', handleInputChange);
            }
        });

        return row;
    }
    function createTicketsCell(mapping, index) {
        const ticketsCell = document.createElement('td');
        const ticketsContainer = document.createElement('div');
        ticketsContainer.className = 'd-flex flex-wrap gap-2 mb-2';

        const ticketsInput = document.createElement('input');
        ticketsInput.type = 'text';
        ticketsInput.className = 'form-control';
        ticketsInput.placeholder = 'Add ticket...';
        ticketsInput.dataset.field = 'tickets';
        ticketsInput.dataset.index = index;

        const tickets = mapping.tickets ? mapping.tickets.split('\n').filter(t => t.trim()) : [];
        tickets.forEach(ticket => {
            ticketsContainer.appendChild(createTicketTag(ticket, index));
        });

        ticketsInput.addEventListener('blur', function() {
            if (this.value.trim()) {
                const ticket = this.value.trim();
                ticketsContainer.appendChild(createTicketTag(ticket, index));
                updateTicketsValue(index);
                this.value = '';
            }
        });

        ticketsInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.value.trim()) {
                    const ticket = this.value.trim();
                    ticketsContainer.appendChild(createTicketTag(ticket, index));
                    updateTicketsValue(index);
                    this.value = '';
                }
            }
        });

        ticketsCell.appendChild(ticketsContainer);
        ticketsCell.appendChild(ticketsInput);
        return ticketsCell;
    }

    function createTicketTag(ticket, index) {
        const tag = document.createElement('span');
        tag.className = 'badge bg-secondary me-1 mb-1 p-2';
        tag.textContent = ticket;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-close btn-close-white ms-2';
        removeBtn.style.fontSize = '0.5em';
        removeBtn.onclick = function(e) {
            e.preventDefault();
            tag.remove();
            updateTicketsValue(index);
        };

        tag.appendChild(removeBtn);
        return tag;
    }

    function updateTicketsValue(index) {
        const cell = document.querySelector(`tr:nth-child(${index + 1}) td:nth-last-child(2)`);
        const tags = Array.from(cell.querySelectorAll('.badge')).map(tag => tag.textContent.trim());
        currentMapping[index].tickets = tags.join('\n');
    }

    function handleInputChange(event) {
        const field = event.target.dataset.field;
        const index = parseInt(event.target.dataset.index);
        const value = event.target.value;

        currentMapping[index][field] = value;

        if (field === 'mappingType' && value !== 'PASSED_THROUGH') {
            currentMapping[index].source = '';
            const sourceInput = event.target.parentNode.parentNode.querySelector('[data-field="source"]');
            if (sourceInput) {
                sourceInput.value = '';
            }
        }
    }

    document.getElementById('addRowBtn').addEventListener('click', function() {
        const newMapping = {
            fieldName: '',
            source: '',
            mappingType: 'NONE',
            notes: '',
            tickets: ''
        };

        currentMapping.unshift(newMapping);
        populateTable(currentMapping);
        window.scrollTo(0, 0);
    });

    window.deleteRow = function(index) {
        if (confirm('Are you sure you want to delete this mapping?')) {
            currentMapping.splice(index, 1);
            populateTable(currentMapping);
        }
    };

    document.getElementById('saveChangesBtn').addEventListener('click', function() {
        if (!currentMapping) {
            alert('No mapping data to save');
            return;
        }

        const xmlContent = generateXML(currentMapping);
        downloadXML(xmlContent);
    });

    function generateXML(mappings) {
    if (!originalXmlStructure) {
        return generateDefaultXML(mappings);
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(originalXmlStructure, "text/xml");
    const fieldNodes = xmlDoc.getElementsByTagName('field');

    const updatedFieldsMap = new Map(
        mappings.map(mapping => [mapping.fieldName, mapping])
    );

    for (let i = 0; i < fieldNodes.length; i++) {
        const fieldNode = fieldNodes[i];
        const destNode = fieldNode.getElementsByTagName('dest')[0];
        const fieldName = destNode ? destNode.textContent : '';

        const updatedField = updatedFieldsMap.get(fieldName);
        if (updatedField) {
            updateFieldNode(fieldNode, updatedField);
        }
    }

    // Process XML to add line breaks and indentation
    let xmlString = new XMLSerializer().serializeToString(xmlDoc);
    xmlString = formatXML(xmlString);
    return xmlString;
}

function formatXML(xml) {
    let formatted = '';
    let indent = '';

    // Convert string to array of lines
    const lines = xml.split(/>\s*</);

    lines.forEach((line, index) => {
        // Add back the removed brackets
        if (index !== 0) line = '<' + line;
        if (index !== lines.length-1) line = line + '>';

        // Handle indentation
        if (line.includes('</')) {
            // Closing tag - reduce indent
            indent = indent.slice(2);
        }

        // Add line with proper indentation
        formatted += indent + line + '\n';

        if (!line.includes('</') && !line.includes('/>')) {
            // Opening tag - increase indent
            indent += '  ';
        }
    });

    return formatted;
}

    function updateFieldNode(fieldNode, updatedField) {
    // Remove existing tickets node and all jira nodes
    Array.from(fieldNode.getElementsByTagName('tickets')).forEach(node => node.remove());

    if (updatedField.tickets) {
        const tickets = updatedField.tickets.split('\n').filter(t => t.trim());
        if (tickets.length > 0) {
            const ticketsNode = fieldNode.ownerDocument.createElement('tickets');
            tickets.forEach(ticket => {
                const jiraNode = fieldNode.ownerDocument.createElement('jira');
                jiraNode.textContent = ticket;
                ticketsNode.appendChild(jiraNode);
            });
            fieldNode.appendChild(ticketsNode);
        }
    }

    const updateTags = {
        'src': updatedField.source,
        'mapping-type': updatedField.mappingType,
        'notes': updatedField.notes
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

    const destNode = xmlDoc.createElement('dest');
    destNode.textContent = mapping.fieldName;
    fieldNode.appendChild(destNode);

    if (mapping.source && mapping.mappingType === 'PASSED_THROUGH') {
        const srcNode = xmlDoc.createElement('src');
        srcNode.textContent = mapping.source;
        fieldNode.appendChild(srcNode);
    }

    const mappingTypeNode = xmlDoc.createElement('mapping-type');
    mappingTypeNode.textContent = mapping.mappingType;
    fieldNode.appendChild(mappingTypeNode);

    if (mapping.notes) {
        const notesNode = xmlDoc.createElement('notes');
        notesNode.textContent = mapping.notes;
        fieldNode.appendChild(notesNode);
    }

    if (mapping.tickets) {
        const tickets = mapping.tickets.split('\n').filter(t => t.trim());
        if (tickets.length > 0) {
            const ticketsNode = xmlDoc.createElement('tickets');
            tickets.forEach(ticket => {
                const jiraNode = xmlDoc.createElement('jira');
                jiraNode.textContent = ticket;
                ticketsNode.appendChild(jiraNode);
            });
            fieldNode.appendChild(ticketsNode);
        }
    }

    return fieldNode;
}

    function generateDefaultXML(mappings) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<mappings>\n';
        mappings.forEach(mapping => {
            xml += '  <field>\n';
            xml += `    <dest>${mapping.fieldName}</dest>\n`;
            if (mapping.source && mapping.mappingType === 'PASSED_THROUGH') {
                xml += `    <src>${mapping.source}</src>\n`;
            }
            xml += `    <mapping-type>${mapping.mappingType}</mapping-type>\n`;
            if (mapping.notes) {
                xml += `    <notes>${mapping.notes}</notes>\n`;
            }
            if (mapping.tickets) {
                const tickets = mapping.tickets.split('\n').filter(t => t.trim());
                tickets.forEach(ticket => {
                    xml += `    <jira>${ticket}</jira>\n`;
                });
            }
            xml += '  </field>\n';
        });
        xml += '</mappings>';
        return xml;
    }

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