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

    // Initialize dialog root
    const dialogRoot = document.getElementById('mappingTableDialogRoot');

    // Handle file addition
    dropzone.on("addedfile", function(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                parseAndDisplayMapping(e.target.result);
            } catch (error) {
                console.error('Error parsing XML:', error);
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

    // Use a single loop instead of nested Array.from and for loop
    for (let i = 0; i < fieldNodes.length; i++) {
        const fieldNode = fieldNodes[i];
        const mapping = {
            fieldName: '',
            mappingType: 'NONE',
            notes: '',
            tickets: '',
            status: 'GOOD'
        };

            // Extract field name (dest)
            const destNode = fieldNode.getElementsByTagName('dest')[0];
            if (destNode) {
                mapping.fieldName = destNode.textContent;
            }

            // Extract mapping type
            const mappingTypeNode = fieldNode.getElementsByTagName('mapping-type')[0];
            if (mappingTypeNode) {
                mapping.mappingType = mappingTypeNode.textContent;
            }

            // Extract notes
            const notesNode = fieldNode.getElementsByTagName('notes')[0];
            if (notesNode) {
                mapping.notes = notesNode.textContent;
            }

            // Extract tickets
            const jiraNodes = fieldNode.getElementsByTagName('jira');
            mapping.tickets = Array.from(jiraNodes)
                .map(node => node.textContent)
                .join('\n');

            // Extract status
            const statusNode = fieldNode.getElementsByTagName('status')[0];
            if (statusNode) {
                mapping.status = statusNode.textContent;
            }

            // Handle specific mapping types
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
    }

        // Sort mappings alphabetically by fieldName
return mappings.sort((a, b) => {
        const nameA = a.fieldName.toLowerCase();
        const nameB = b.fieldName.toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

    // Extract DERIVED mapping data
    function extractDerivedMapping(fieldNode) {
        const ifElseNode = fieldNode.getElementsByTagName('ifelse')[0];
        if (!ifElseNode) {
            // Check for direct if nodes without ifelse wrapper
            const ifNode = fieldNode.getElementsByTagName('if')[0];
            if (!ifNode) return null;
            return extractConditionsFromNode(ifNode);
        }

        const mapping = {
            conditions: [],
            value: ''
        };

        // Extract all if/else-if nodes
        const ifNodes = [...fieldNode.getElementsByTagName('if'), ...fieldNode.getElementsByTagName('else-if')];

        for (const ifNode of ifNodes) {
            const conditions = extractConditionsFromNode(ifNode);
            if (conditions) {
                mapping.conditions = conditions.conditions;
                if (!mapping.value && conditions.value) {
                    mapping.value = conditions.value;
                }
            }
        }

        return mapping;
    }

    // Helper function to extract conditions from if/else-if nodes
    function extractConditionsFromNode(node) {
        const result = {
            conditions: [],
            value: ''
        };

        const andNode = node.getElementsByTagName('and')[0];
        if (andNode) {
            const condNodes = andNode.getElementsByTagName('cond');
            for (const condNode of condNodes) {
                result.conditions.push({
                    src: condNode.getElementsByTagName('src')[0]?.textContent || '',
                    oper: condNode.getElementsByTagName('oper')[0]?.textContent || 'EQUALS',
                    value: condNode.getElementsByTagName('value')[0]?.textContent || ''
                });
            }
        } else {
            // Handle single condition without 'and' wrapper
            const orNode = node.getElementsByTagName('or')[0];
            if (orNode) {
                const condNodes = orNode.getElementsByTagName('cond');
                for (const condNode of condNodes) {
                    result.conditions.push({
                        src: condNode.getElementsByTagName('src')[0]?.textContent || '',
                        oper: condNode.getElementsByTagName('oper')[0]?.textContent || 'EQUALS',
                        value: condNode.getElementsByTagName('value')[0]?.textContent || ''
                    });
                }
            }
        }

        // Extract value
        const valueNode = node.getElementsByTagName('value')[0];
        if (valueNode) {
            result.value = valueNode.textContent;
        }

        return result;
    }

    // Extract MAPPED mapping data
    function extractMappedValues(fieldNode) {
    const ctableNode = fieldNode.getElementsByTagName('ctable')[0];
    if (!ctableNode) return null;

    const result = {
        src: '',
        mappings: []
    };

    // Get source from cols
    const colsNode = ctableNode.getElementsByTagName('cols')[0];
    if (colsNode) {
        const srcNode = colsNode.getElementsByTagName('src')[0];
        if (srcNode) {
            result.src = srcNode.textContent;
        }
    }

    // Get mappings from rows
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
    // Populate table with mapping data
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
        fieldNameInput.addEventListener('change', (e) => updateMappingField(index, 'fieldName', e.target.value));
        fieldNameCell.appendChild(fieldNameInput);
        row.appendChild(fieldNameCell);

        // Source cell
        const sourceCell = createSourceCell(mapping, index);
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

        mappingTypeSelect.addEventListener('change', handleMappingTypeChange);
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
        notesTextarea.addEventListener('change', (e) => updateMappingField(index, 'notes', e.target.value));
        notesCell.appendChild(notesTextarea);
        row.appendChild(notesCell);

        // Tickets cell
        const ticketsCell = createTicketsCell(mapping, index);
        row.appendChild(ticketsCell);

        // Status cell
        const statusCell = document.createElement('td');
        const statusSelect = document.createElement('select');
        statusSelect.className = 'form-select';
        statusSelect.dataset.field = 'status';
        statusSelect.dataset.index = index;

        ['GOOD', 'BAD', 'PENDING'].forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            if (mapping.status === status) {
                option.selected = true;
            }
            statusSelect.appendChild(option);
        });

        statusSelect.addEventListener('change', (e) => updateMappingField(index, 'status', e.target.value));
        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);

        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'text-center';

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger btn-sm';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Delete mapping';
        deleteButton.onclick = () => deleteRow(index);

        actionsCell.appendChild(deleteButton);
        row.appendChild(actionsCell);

        return row;
    }

    // Create source cell based on mapping type
    function createSourceCell(mapping, index) {
    const sourceCell = document.createElement('td');

    switch (mapping.mappingType) {
        case 'PASSED_THROUGH':
            const sourceInput = document.createElement('input');
            sourceInput.type = 'text';
            sourceInput.className = 'form-control';
            sourceInput.value = mapping.source || '';
            sourceInput.dataset.field = 'source';
            sourceInput.dataset.index = index;
            sourceInput.addEventListener('change', (e) => updateMappingField(index, 'source', e.target.value));
            sourceCell.appendChild(sourceInput);
            break;

        case 'DERIVED':
            const derivedButton = document.createElement('button');
            derivedButton.className = 'btn btn-outline-secondary btn-sm';
            derivedButton.innerHTML = '<i class="fas fa-code"></i> Edit Logic';
            derivedButton.onclick = () => showDerivedMappingDialog(mapping, index);

            const derivedPreview = document.createElement('div');
            derivedPreview.className = 'mt-2 text-muted small';
            if (mapping.derivedMapping?.conditions?.length > 0) {
                derivedPreview.textContent = `${mapping.derivedMapping.conditions.length} condition(s)`;
            }

            sourceCell.appendChild(derivedButton);
            sourceCell.appendChild(derivedPreview);
            break;

        case 'MAPPED':
            // Create container for grid and button
            const container = document.createElement('div');
            container.className = 'd-flex flex-column gap-2';

            // Add mappings preview grid
            if (mapping.mappedValues?.mappings?.length > 0) {
                const table = document.createElement('table');
                table.className = 'table table-sm table-bordered mb-2';
                table.style.fontSize = '0.875rem';

                // Create table header
                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');

                // Get the source path from mappedValues
                const sourcePath = mapping.mappedValues.src || '';

                // Create headers using fieldName and source path
                [
                    {text: mapping.fieldName || 'Value', className: 'bg-light text-secondary'},
                    {text: sourcePath || 'Maps To', className: 'bg-light text-secondary'}
                ].forEach(header => {
                    const th = document.createElement('th');
                    th.className = header.className;
                    th.style.padding = '0.25rem 0.5rem';
                    th.textContent = header.text;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);

                // Create table body
                const tbody = document.createElement('tbody');
                mapping.mappedValues.mappings.forEach(mapValue => {
                    const row = document.createElement('tr');

                    // From value
                    const fromCell = document.createElement('td');
                    fromCell.style.padding = '0.25rem 0.5rem';
                    fromCell.textContent = mapValue.from || '';
                    row.appendChild(fromCell);

                    // To value
                    const toCell = document.createElement('td');
                    toCell.style.padding = '0.25rem 0.5rem';
                    toCell.textContent = mapValue.to || '';
                    row.appendChild(toCell);

                    tbody.appendChild(row);
                });
                table.appendChild(tbody);
                container.appendChild(table);
            }

            // Add Edit button below the table
            const mappedButton = document.createElement('button');
            mappedButton.className = 'btn btn-outline-secondary btn-sm w-100';
            mappedButton.innerHTML = '<i class="fas fa-table"></i> Edit Mappings';
            mappedButton.onclick = () => showMappedDialog(mapping, index);
            container.appendChild(mappedButton);

            // Add preview text
            //const mappedPreview = document.createElement('div');
            //mappedPreview.className = 'text-muted small text-center';
            //if (mapping.mappedValues?.mappings?.length > 0) {
                //mappedPreview.textContent = `${mapping.mappedValues.mappings.length} mapping(s)`;
            //}
            //container.appendChild(mappedPreview);

            sourceCell.appendChild(container);
            break;

        default:
            sourceCell.textContent = 'N/A';
            break;
    }

    return sourceCell;
}

    // Create tickets cell with tag functionality
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

    // Create individual ticket tag
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

    // Update mapping field value
    function updateMappingField(index, field, value) {
        currentMapping[index][field] = value;
    }

    // Delete row functionality
    function deleteRow(index) {
        if (confirm('Are you sure you want to delete this mapping?')) {
            currentMapping.splice(index, 1);
            populateTable(currentMapping);
        }
    }
    // Show DERIVED mapping dialog
    function showDerivedMappingDialog(mapping, index) {
        const derivedData = mapping.derivedMapping || {
            conditions: [],
            value: ''
        };

        // For complex derived mappings with OR conditions
        if (mapping.ifelse) {
            const conditions = [];
            const ifNodes = mapping.ifelse.getElementsByTagName('if');
            for (const ifNode of ifNodes) {
                const andNode = ifNode.getElementsByTagName('and')[0];
                if (andNode) {
                    const condNodes = andNode.getElementsByTagName('cond');
                    for (const condNode of condNodes) {
                        conditions.push({
                            src: condNode.getElementsByTagName('src')[0]?.textContent || '',
                            oper: condNode.getElementsByTagName('oper')[0]?.textContent || 'EQUALS',
                            value: condNode.getElementsByTagName('value')[0]?.textContent || ''
                        });
                    }
                }
            }
            derivedData.conditions = conditions;
            derivedData.value = mapping.ifelse.getElementsByTagName('value')[0]?.textContent || '';
        }

        ReactDOM.render(
            React.createElement(window.MappingTableDialog, {
                isOpen: true,
                onClose: () => {
                    ReactDOM.render(null, dialogRoot);
                },
                mappingType: 'DERIVED',
                initialData: derivedData,
                onSave: (newMapping) => {
                    currentMapping[index].derivedMapping = newMapping;
                    populateTable(currentMapping);
                    ReactDOM.render(null, dialogRoot);
                }
            }),
            dialogRoot
        );
    }

    // Show MAPPED dialog
    function showMappedDialog(mapping, index) {
        const mappedData = {
            src: mapping.mappedValues?.src || '',
            mappings: mapping.mappedValues?.mappings || []
        };

        ReactDOM.render(
            React.createElement(window.MappingTableDialog, {
                isOpen: true,
                onClose: () => {
                    ReactDOM.render(null, dialogRoot);
                },
                mappingType: 'MAPPED',
                initialData: mappedData,
                onSave: (newMapping) => {
                    currentMapping[index].mappedValues = newMapping;
                    populateTable(currentMapping);
                    ReactDOM.render(null, dialogRoot);
                }
            }),
            dialogRoot
        );
    }

    // Update tickets value in mapping data
    function updateTicketsValue(index) {
        const cell = document.querySelector(`tr:nth-child(${index + 1}) td:nth-last-child(3)`);
        const tags = Array.from(cell.querySelectorAll('.badge')).map(tag => {
            const textContent = tag.textContent;
            return textContent.substring(0, textContent.length - 1).trim(); // Remove the × from the end
        });
        currentMapping[index].tickets = tags.join('\n');
    }

    // Add new row functionality
    document.getElementById('addRowBtn').addEventListener('click', function() {
        const newMapping = {
            fieldName: '',
            mappingType: 'NONE',
            notes: '',
            tickets: '',
            status: 'GOOD'
        };
        currentMapping.push(newMapping);
        // Re-sort the array after adding new mapping
        currentMapping.sort((a, b) => {
            const nameA = a.fieldName.toLowerCase();
            const nameB = b.fieldName.toLowerCase();
            return nameA.localeCompare(nameB);
        });
        populateTable(currentMapping);
        window.scrollTo(0, 0);
    });

    // Generate XML when saving
document.getElementById('saveChangesBtn').addEventListener('click', function() {
    if (!currentMapping) {
        alert('No mapping data to save');
        return;
    }
    console.log('Current Mapping:', currentMapping);
    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<mappings>\n';

    currentMapping.forEach(mapping => {
    xmlContent += '  <field>\n';
    xmlContent += `    <dest>${escapeXml(mapping.fieldName || '')}</dest>\n`;
    xmlContent += `    <mapping-type>${escapeXml(mapping.mappingType || 'NONE')}</mapping-type>\n`;

    // Ensure at least a default structure for each mapping type
    switch (mapping.mappingType) {
        case 'PASSED_THROUGH':
            xmlContent += mapping.source ? `    <src>${escapeXml(mapping.source)}</src>\n` : '';
            break;

        case 'DERIVED':
            if (mapping.derivedMapping && mapping.derivedMapping.conditions.length > 0) {
                xmlContent += '    <ifelse>\n';
                xmlContent += '      <if>\n';
                xmlContent += '        <and>\n';
                mapping.derivedMapping.conditions.forEach(condition => {
                    xmlContent += '          <cond>\n';
                    xmlContent += `            <src>${escapeXml(condition.src || '')}</src>\n`;
                    xmlContent += `            <oper>${escapeXml(condition.oper || 'EQUALS')}</oper>\n`;
                    xmlContent += `            <value>${escapeXml(condition.value || '')}</value>\n`;
                    xmlContent += '          </cond>\n';
                });
                xmlContent += '        </and>\n';
                xmlContent += `        <value>${escapeXml(mapping.derivedMapping.value || '')}</value>\n`;
                xmlContent += '      </if>\n';
                xmlContent += '    </ifelse>\n';
            } else {
                xmlContent += '    <ifelse/>\n'; // Empty ifelse if no conditions
            }
            break;

        case 'MAPPED':
            if (mapping.mappedValues && mapping.mappedValues.mappings.length > 0) {
                xmlContent += '    <ctable>\n';
                xmlContent += '      <cols>\n';
                xmlContent += `        <src>${escapeXml(mapping.mappedValues.src || '')}</src>\n`;
                xmlContent += '      </cols>\n';
                mapping.mappedValues.mappings.forEach(mapValue => {
                    xmlContent += '      <row>\n';
                    xmlContent += `        <value>${escapeXml(mapValue.from || '')}</value>\n`;
                    xmlContent += `        <value>${escapeXml(mapValue.to || '')}</value>\n`;
                    xmlContent += '      </row>\n';
                });
                xmlContent += '    </ctable>\n';
            } else {
                xmlContent += '    <ctable/>\n'; // Empty ctable if no mappings
            }
            break;
    }

    if (mapping.notes) {
        xmlContent += `    <notes>${escapeXml(mapping.notes)}</notes>\n`;
    }
    if (mapping.tickets) {
        const tickets = mapping.tickets.split('\n').filter(t => t.trim());
        tickets.forEach(ticket => {
            xmlContent += `    <jira>${escapeXml(ticket)}</jira>\n`;
        });
    }
    xmlContent += `    <status>${escapeXml(mapping.status || 'GOOD')}</status>\n`;
    xmlContent += '  </field>\n';
});

    xmlContent += '</mappings>';

    // Debug: Log the generated XML
    console.log('Generated XML:', xmlContent);

    // Validate XML
    if (!validateXml(xmlContent)) {
        alert('Generated XML is invalid. Please check the console for details.');
        return;
    }

    // Create and trigger download
       try {
        const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mapping.xml';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (e) {
        console.error('Error creating Blob:', e);
        alert('Failed to save the XML file. Please check the console for details.');
    }
});

// Validation function
function validateXml(xmlString) {
    try {
        const parser = new DOMParser();
        parser.parseFromString(xmlString, 'text/xml');
        return true;
    } catch (e) {
        console.error('Invalid XML:', e.message);
        return false;
    }
}

// Robust escapeXml function
function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

    // Handle mapping type changes
function handleMappingTypeChange(event) {
        const index = parseInt(event.target.dataset.index);
        const newType = event.target.value;
        const mapping = currentMapping[index];

        // Reset source-related fields
        mapping.source = '';
        mapping.derivedMapping = null;
        mapping.mappedValues = null;

        // Update mapping type
        mapping.mappingType = newType;

        // Refresh the table
        populateTable(currentMapping);
    }
});