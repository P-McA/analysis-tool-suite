// Disable Dropzone auto discover
Dropzone.autoDiscover = false;

document.addEventListener('DOMContentLoaded', function() {
    let currentMapping = null;

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
                // Parse the XML and display in editor
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

        // Extract mapping data
        currentMapping = extractMappingData(xmlDoc);

        // Display the editor section
        document.getElementById('editorSection').classList.remove('d-none');

        // Populate the table
        populateTable(currentMapping);
    }

    // Extract mapping data from XML
    function extractMappingData(xmlDoc) {
        const mappings = [];
        const mappingNodes = xmlDoc.getElementsByTagName('mapping');

        for (const node of mappingNodes) {
            mappings.push({
                fieldName: node.getAttribute('fieldName') || '',
                sourcePath: node.getAttribute('sourcePath') || '',
                targetPath: node.getAttribute('targetPath') || '',
                dataType: node.getAttribute('dataType') || 'string',
                required: node.getAttribute('required') === 'true'
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
            <td>
                <input type="text" class="form-control" value="${mapping.fieldName}" 
                       data-field="fieldName" data-index="${index}">
            </td>
            <td>
                <input type="text" class="form-control" value="${mapping.sourcePath}" 
                       data-field="sourcePath" data-index="${index}">
            </td>
            <td>
                <input type="text" class="form-control" value="${mapping.targetPath}" 
                       data-field="targetPath" data-index="${index}">
            </td>
            <td>
                <select class="form-select" data-field="dataType" data-index="${index}">
                    <option value="string" ${mapping.dataType === 'string' ? 'selected' : ''}>String</option>
                    <option value="number" ${mapping.dataType === 'number' ? 'selected' : ''}>Number</option>
                    <option value="boolean" ${mapping.dataType === 'boolean' ? 'selected' : ''}>Boolean</option>
                    <option value="date" ${mapping.dataType === 'date' ? 'selected' : ''}>Date</option>
                </select>
            </td>
            <td class="text-center">
                <input type="checkbox" class="form-check-input" ${mapping.required ? 'checked' : ''} 
                       data-field="required" data-index="${index}">
            </td>
            <td class="text-center">
                <button class="btn btn-danger btn-sm" onclick="deleteRow(${index})">Delete</button>
            </td>
        `;

        // Add event listeners for input changes
        row.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('change', handleInputChange);
        });

        return row;
    }

    // Handle input changes
    function handleInputChange(event) {
        const field = event.target.dataset.field;
        const index = parseInt(event.target.dataset.index);
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;

        currentMapping[index][field] = value;
    }

    // Add new row
    document.getElementById('addRowBtn').addEventListener('click', function() {
        const newMapping = {
            fieldName: '',
            sourcePath: '',
            targetPath: '',
            dataType: 'string',
            required: false
        };

        currentMapping.push(newMapping);
        const row = createTableRow(newMapping, currentMapping.length - 1);
        document.getElementById('mappingTableBody').appendChild(row);
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
            xml += '  <mapping';
            xml += ` fieldName="${escapeXML(mapping.fieldName)}"`;
            xml += ` sourcePath="${escapeXML(mapping.sourcePath)}"`;
            xml += ` targetPath="${escapeXML(mapping.targetPath)}"`;
            xml += ` dataType="${escapeXML(mapping.dataType)}"`;
            xml += ` required="${mapping.required}"`;
            xml += '/>\n';
        });

        xml += '</mappings>';
        return xml;
    }

    // Escape XML special characters
    function escapeXML(str) {
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