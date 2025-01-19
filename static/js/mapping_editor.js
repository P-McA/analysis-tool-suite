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
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        currentMapping = extractMappingData(xmlDoc);

        // Sort the mappings alphabetically
        currentMapping.sort((a, b) => {
            return sortFieldNames(a.fieldName, b.fieldName);
        });

        document.getElementById('editorSection').classList.remove('d-none');
        populateTable(currentMapping);
    }

    // Sort function for FIXML field names considering repeating groups
    function sortFieldNames(a, b) {
        // Split field names into parts based on repeating group notation
        const partsA = a.split(/(\d+)/);
        const partsB = b.split(/(\d+)/);

        // Compare each part
        for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
            // If both parts are numbers, compare numerically
            if (!isNaN(partsA[i]) && !isNaN(partsB[i])) {
                const diff = parseInt(partsA[i]) - parseInt(partsB[i]);
                if (diff !== 0) return diff;
            }
            // Otherwise compare alphabetically
            else {
                const diff = partsA[i].localeCompare(partsB[i]);
                if (diff !== 0) return diff;
            }
        }
        return partsA.length - partsB.length;
    }

    // Extract mapping data from XML
    function extractMappingData(xmlDoc) {
        const mappings = [];
        const fieldNodes = xmlDoc.getElementsByTagName('field');

        for (const fieldNode of fieldNodes) {
            const destNode = fieldNode.getElementsByTagName('dest')[0];
            const notesNode = fieldNode.getElementsByTagName('notes')[0];
            const jiraNode = fieldNode.getElementsByTagName('jira')[0];
            const mappingTypeNode = fieldNode.getElementsByTagName('mapping-type')[0];

            mappings.push({
                fieldName: destNode ? destNode.textContent.trim() : '',
                source: fieldNode.getAttribute('source') || '',
                mappingType: mappingTypeNode ? mappingTypeNode.textContent.trim() : 'NONE',
                notes: notesNode ? notesNode.textContent.trim() : '',
                tickets: jiraNode ? jiraNode.textContent.trim() : ''
            });
        }

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
        row.innerHTML = `
            <td class="text-center">
                ${index + 1}
            </td>
            <td>
                <input type="text" class="form-control" value="${mapping.fieldName}" 
                       data-field="fieldName" data-index="${index}">
            </td>
            <td>
                <input type="text" class="form-control" value="${mapping.source}" 
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
                         rows="2">${mapping.notes}</textarea>
            </td>
            <td>
                <input type="text" class="form-control" value="${mapping.tickets}" 
                       data-field="tickets" data-index="${index}">
            </td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="deleteRow(${index})">Delete</button>
            </td>
        `;

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

        currentMapping[index][field] = value;
    }

    // Add new row
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
            xml += `    <dest>${escapeXML(mapping.fieldName)}</dest>\n`;
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