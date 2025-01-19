// Disable Dropzone auto discover
Dropzone.autoDiscover = false;

document.addEventListener('DOMContentLoaded', function() {
    let currentMapping = null;

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
        currentMapping = extractMappingData(xmlString);
        document.getElementById('editorSection').classList.remove('d-none');
        populateTable(currentMapping);
    }

    // Extract mapping data from XML
    // Extract mapping data from XML
// Extract mapping data from XML
function extractMappingData(xmlString) {
    const mappings = [];

    // Get all field elements
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    const fieldNodes = xmlDoc.getElementsByTagName('field');

    for (let i = 0; i < fieldNodes.length; i++) {
        const fieldNode = fieldNodes[i];

        // Get the raw content of the dest tag using regex
        const destMatch = new XMLSerializer()
            .serializeToString(fieldNode)
            .match(/<dest>([\s\S]*?)<\/dest>/);

        const fieldName = destMatch ? destMatch[1] : '';

        // Get other nodes content
        const mappingTypeNode = fieldNode.getElementsByTagName('mapping-type')[0];
        const notesNode = fieldNode.getElementsByTagName('notes')[0];
        const jiraNode = fieldNode.getElementsByTagName('jira')[0];

        mappings.push({
            fieldName: fieldName,
            source: fieldNode.getAttribute('source') || '',
            mappingType: mappingTypeNode ? mappingTypeNode.textContent : 'NONE',
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

    // Helper function to get exact content between tags
    function getTagContent(xmlString, tagName, contextNode) {
        const serializer = new XMLSerializer();
        const nodeString = serializer.serializeToString(contextNode);

        const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 's');
        const match = nodeString.match(regex);
        return match ? match[1] : '';
    }

    // Helper function to get text content of a child node
    function getNodeTextContent(parentNode, tagName) {
        const node = parentNode.getElementsByTagName(tagName)[0];
        return node ? node.textContent : '';
    }

    // Update the populateTable function to sort mappings
function populateTable(mappings) {
    const tbody = document.getElementById('mappingTableBody');
    tbody.innerHTML = '';

    // Sort the mappings array if it's not a new row being added at the top
    if (!mappings[0] || mappings[0].fieldName) {
        mappings.sort((a, b) => {
            if (!a.fieldName) return 1;
            if (!b.fieldName) return -1;
            return a.fieldName.localeCompare(b.fieldName);
        });
    }

    mappings.forEach((mapping, index) => {
        const row = createTableRow(mapping, index);
        tbody.appendChild(row);
    });
}

    // Create table row for mapping
    function createTableRow(mapping, index) {
    const row = document.createElement('tr');

    // Create cells individually for better control
    const numberCell = document.createElement('td');
    numberCell.className = 'text-center';
    numberCell.textContent = index + 1;

    const fieldNameCell = document.createElement('td');
    const fieldNameInput = document.createElement('input');
    fieldNameInput.type = 'text';
    fieldNameInput.className = 'form-control font-monospace';
    fieldNameInput.value = mapping.fieldName;
    fieldNameInput.dataset.field = 'fieldName';
    fieldNameInput.dataset.index = index;
    fieldNameCell.appendChild(fieldNameInput);

    // Build the rest of the row
    const rowContent = `
        <td>
            <input type="text" class="form-control" value="${escapeHtml(mapping.source)}" 
                   data-field="source" data-index="${index}">
        </td>
        <td>
            <select class="form-select" data-field="mappingType" data-index="${index}">
                ${MAPPING_TYPES.map(type => `
                    <option value="${type}" ${mapping.mappingType === type ? 'selected' : ''}>
                        ${type}
                    </option>
                `).join('')}
            </select>
        </td>
        <td>
            <textarea class="form-control" data-field="notes" data-index="${index}" 
                     rows="2">${escapeHtml(mapping.notes)}</textarea>
        </td>
        <td>
            <input type="text" class="form-control" value="${escapeHtml(mapping.tickets)}" 
                   data-field="tickets" data-index="${index}">
        </td>
        <td class="text-center">
            <button class="btn btn-danger btn-sm" onclick="deleteRow(${index})">Delete</button>
        </td>
    `;

    row.appendChild(numberCell);
    row.appendChild(fieldNameCell);

    // Add the rest of the content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rowContent;
    while (tempDiv.firstChild) {
        row.appendChild(tempDiv.firstChild);
    }

    // Add event listeners for input changes
    row.querySelectorAll('input, select, textarea').forEach(input => {
        input.addEventListener('change', handleInputChange);
    });

    return row;
}

// Helper function to safely escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

    // Handle input changes
    function handleInputChange(event) {
        const field = event.target.dataset.field;
        const index = parseInt(event.target.dataset.index);
        const value = event.target.value;

        currentMapping[index][field] = value;
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

    // Generate XML from mapping data
    function generateXML(mappings) {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<mappings>\n';

        mappings.forEach(mapping => {
            xml += '  <field';
            xml += ` source="${escapeXML(mapping.source)}"`;
            xml += '>\n';
            xml += `    <dest>${mapping.fieldName}</dest>\n`;  // Don't escape the field name
            xml += `    <mapping-type>${escapeXML(mapping.mappingType)}</mapping-type>\n`;
            if (mapping.notes) {
                xml += `    <notes>${escapeXML(mapping.notes)}</notes>\n`;
            }
            if (mapping.tickets) {
                xml += `    <jira>${escapeXML(mapping.tickets)}</jira>\n`;
            }
            xml += '  </field>\n';
        });

        xml += '</mappings>';
        return xml;
    }

    // Escape XML special characters
    function escapeXML(str) {
        if (!str) return '';
        return str.replace(/[<>&'"]/g, function(c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
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