// Disable Dropzone auto discover
Dropzone.autoDiscover = false;

document.addEventListener('DOMContentLoaded', function() {
    let currentMapping = null;
    let originalXmlStructure = null;

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
            try {
                parseAndDisplayMapping(e.target.result);
            } catch (error) {
                alert('Error parsing XML file: ' + error.message);
            }
        };
        reader.readAsText(file);
    });

    function parseAndDisplayMapping(xmlString) {
        originalXmlStructure = xmlString;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");
        currentMapping = extractMappingData(xmlDoc);
        document.getElementById('editorSection').classList.remove('d-none');
        populateTable(currentMapping);
    }

    function extractMappingData(xmlDoc) {
        const mappings = [];
        const fieldNodes = xmlDoc.getElementsByTagName('field');

        for (let i = 0; i < fieldNodes.length; i++) {
            const fieldNode = fieldNodes[i];
            const mapping = {
                fieldName: getDestContent(fieldNode),
                mappingType: getMappingType(fieldNode),
                source: '',
                notes: getNodeTextContent(fieldNode, 'notes'),
                tickets: getJiraTickets(fieldNode)
            };

            if (mapping.mappingType === 'MAPPED') {
                mapping.mappedData = extractMappedData(fieldNode);
            } else if (mapping.mappingType === 'PASSED_THROUGH') {
                mapping.source = getSourceContent(fieldNode);
            }

            mappings.push(mapping);
        }

        return mappings.sort((a, b) => a.fieldName.localeCompare(b.fieldName));
    }

    function getDestContent(fieldNode) {
        const destMatch = new XMLSerializer()
            .serializeToString(fieldNode)
            .match(/<dest>([\s\S]*?)<\/dest>/);
        return destMatch ? destMatch[1] : '';
    }

    function getMappingType(fieldNode) {
        const typeNode = fieldNode.getElementsByTagName('mapping-type')[0];
        return typeNode ? typeNode.textContent : 'NONE';
    }
    function getNodeTextContent(parentNode, tagName) {
    const node = parentNode.getElementsByTagName(tagName)[0];
    return node ? node.textContent : '';
}
    function getSourceContent(fieldNode) {
        const srcMatch = new XMLSerializer()
            .serializeToString(fieldNode)
            .match(/<src>([\s\S]*?)<\/src>/);
        return srcMatch ? srcMatch[1] : '';
    }

    function getJiraTickets(fieldNode) {
        const jiraNodes = fieldNode.getElementsByTagName('jira');
        return Array.from(jiraNodes).map(node => node.textContent).join('\n');
    }

    function extractMappedData(fieldNode) {
        const mapping = {
            type: fieldNode.getElementsByTagName('ifelse').length > 0 ? 'conditional' : 'direct',
            sources: [],
            mappings: []
        };

        if (mapping.type === 'conditional') {
            const ifNodes = fieldNode.getElementsByTagName('if');
            Array.from(ifNodes).forEach(ifNode => {
                const condition = {
                    ref: getNodeTextContent(ifNode, 'ref'),
                    sources: [],
                    rows: []
                };

                const srcNodes = ifNode.getElementsByTagName('ctable')[0]
                    .getElementsByTagName('cols')[0]
                    .getElementsByTagName('src');
                condition.sources = Array.from(srcNodes).map(src => src.textContent);

                const rowNodes = ifNode.getElementsByTagName('row');
                Array.from(rowNodes).forEach(row => {
                    const values = Array.from(row.getElementsByTagName('value'))
                        .map(val => val.textContent);
                    condition.rows.push(values);
                });

                mapping.mappings.push(condition);
            });
        } else {
            const ctable = fieldNode.getElementsByTagName('ctable')[0];
            const srcNodes = ctable.getElementsByTagName('cols')[0]
                .getElementsByTagName('src');
            mapping.sources = Array.from(srcNodes).map(src => src.textContent);

            const rowNodes = ctable.getElementsByTagName('row');
            Array.from(rowNodes).forEach(row => {
                const values = Array.from(row.getElementsByTagName('value'))
                    .map(val => val.textContent);
                mapping.mappings.push(values);
            });
        }

        return mapping;
    }
    function populateTable(mappings) {
        const tbody = document.getElementById('mappingTableBody');
        tbody.innerHTML = '';
        mappings.forEach((mapping, index) => {
            const row = createTableRow(mapping, index);
            tbody.appendChild(row);
        });
    }

    function createTableRow(mapping, index) {
        const row = document.createElement('tr');

        // Number cell
        row.appendChild(createCell('td', index + 1, 'text-center'));

        // Field Name cell
        row.appendChild(createFieldNameCell(mapping, index));

        // Source/Mapping cell
        if (mapping.mappingType === 'MAPPED') {
            row.appendChild(createMappedCell(mapping.mappedData, index));
        } else {
            row.appendChild(createSourceCell(mapping, index));
        }

        // Mapping Type cell
        row.appendChild(createMappingTypeCell(mapping, index));

        // Notes cell
        row.appendChild(createNotesCell(mapping, index));

        // Tickets cell
        row.appendChild(createTicketsCell(mapping, index));

        // Actions cell
        row.appendChild(createActionsCell(index));

        return row;
    }

    function createCell(type, content, className = '') {
        const cell = document.createElement(type);
        if (className) cell.className = className;
        if (content) cell.textContent = content;
        return cell;
    }

    function createFieldNameCell(mapping, index) {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control font-monospace';
        input.value = mapping.fieldName;
        input.dataset.field = 'fieldName';
        input.dataset.index = index;
        input.addEventListener('change', handleInputChange);
        cell.appendChild(input);
        return cell;
    }

    function createMappedCell(mappedData, index) {
        const cell = document.createElement('td');
        const container = document.createElement('div');
        container.className = 'mapped-data-container';

        if (mappedData.type === 'conditional') {
            mappedData.mappings.forEach(condition => {
                const conditionDiv = document.createElement('div');
                conditionDiv.className = 'condition-block mb-3';

                const refDiv = document.createElement('div');
                refDiv.className = 'ref-label mb-2';
                refDiv.textContent = `Ref: ${condition.ref}`;
                conditionDiv.appendChild(refDiv);

                const table = createMappingTable(condition.sources, condition.rows);
                conditionDiv.appendChild(table);
                container.appendChild(conditionDiv);
            });
        } else {
            const table = createMappingTable(mappedData.sources, mappedData.mappings);
            container.appendChild(table);
        }

        cell.appendChild(container);
        return cell;
    }

    function createMappingTable(sources, rows) {
        const table = document.createElement('table');
        table.className = 'table table-sm table-bordered mapping-table';

        // Header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        sources.forEach(source => {
            const th = document.createElement('th');
            th.textContent = source;
            headerRow.appendChild(th);
        });
        headerRow.appendChild(document.createElement('th')); // For output
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Value rows
        const tbody = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        return table;
    }

    function createSourceCell(mapping, index) {
        const cell = document.createElement('td');
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.value = mapping.source;
        input.dataset.field = 'source';
        input.dataset.index = index;
        input.addEventListener('change', handleInputChange);
        cell.appendChild(input);
        return cell;
    }

    function createMappingTypeCell(mapping, index) {
        const cell = document.createElement('td');
        const select = document.createElement('select');
        select.className = 'form-select';
        select.dataset.field = 'mappingType';
        select.dataset.index = index;

        MAPPING_TYPES.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            if (mapping.mappingType === type) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        select.addEventListener('change', handleInputChange);
        cell.appendChild(select);
        return cell;
    }

    function createNotesCell(mapping, index) {
        const cell = document.createElement('td');
        const textarea = document.createElement('textarea');
        textarea.className = 'form-control';
        textarea.value = mapping.notes;
        textarea.dataset.field = 'notes';
        textarea.dataset.index = index;
        textarea.rows = 2;
        textarea.addEventListener('change', handleInputChange);
        cell.appendChild(textarea);
        return cell;
    }

    function createTicketsCell(mapping, index) {
        const cell = document.createElement('td');
        const container = document.createElement('div');
        container.className = 'd-flex flex-wrap gap-2 mb-2';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.placeholder = 'Add ticket...';
        input.dataset.field = 'tickets';
        input.dataset.index = index;

        const tickets = mapping.tickets ? mapping.tickets.split('\n').filter(t => t.trim()) : [];
        tickets.forEach(ticket => {
            container.appendChild(createTicketTag(ticket, index));
        });

        input.addEventListener('blur', function() {
            if (this.value.trim()) {
                const ticket = this.value.trim();
                container.appendChild(createTicketTag(ticket, index));
                updateTicketsValue(index);
                this.value = '';
            }
        });

        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.value.trim()) {
                    const ticket = this.value.trim();
                    container.appendChild(createTicketTag(ticket, index));
                    updateTicketsValue(index);
                    this.value = '';
                }
            }
        });

        cell.appendChild(container);
        cell.appendChild(input);
        return cell;
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

    function sortJiraTickets(tickets) {
        return tickets.sort((a, b) => {
            const [prefixA, numA] = a.split('-');
            const [prefixB, numB] = b.split('-');
            if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
            return parseInt(numB) - parseInt(numA);
        });
    }

    function handleInputChange(event) {
        const field = event.target.dataset.field;
        const index = parseInt(event.target.dataset.index);
        const value = event.target.value;

        currentMapping[index][field] = value;

        if (field === 'mappingType') {
            if (value === 'MAPPED') {
                currentMapping[index].mappedData = {
                    type: 'direct',
                    sources: [],
                    mappings: []
                };
            } else if (value !== 'PASSED_THROUGH') {
                currentMapping[index].source = '';
                const sourceInput = event.target.parentNode.parentNode.querySelector('[data-field="source"]');
                if (sourceInput) {
                    sourceInput.value = '';
                }
            }
            populateTable(currentMapping);
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

        // Update existing fields
        for (let i = 0; i < fieldNodes.length; i++) {
            const fieldNode = fieldNodes[i];
            const destNode = fieldNode.getElementsByTagName('dest')[0];
            const fieldName = destNode ? destNode.textContent : '';

            const updatedField = updatedFieldsMap.get(fieldName);
            if (updatedField) {
                updateFieldNode(fieldNode, updatedField);
            }
        }

        // Add new fields
        const existingFields = new Set(Array.from(fieldNodes).map(node =>
            node.getElementsByTagName('dest')[0]?.textContent
        ));

        mappings.forEach(mapping => {
            if (!existingFields.has(mapping.fieldName)) {
                const newField = createNewFieldNode(xmlDoc, mapping);
                xmlDoc.documentElement.appendChild(newField);
            }
        });

        return formatXML(new XMLSerializer().serializeToString(xmlDoc));
    }

    function updateFieldNode(fieldNode, updatedField) {
        // Handle tickets
        Array.from(fieldNode.getElementsByTagName('tickets')).forEach(node => node.remove());

        if (updatedField.tickets) {
            const ticketsNode = fieldNode.ownerDocument.createElement('tickets');
            const tickets = updatedField.tickets.split('\n').filter(t => t.trim());
            sortJiraTickets(tickets).forEach(ticket => {
                const jiraNode = fieldNode.ownerDocument.createElement('jira');
                jiraNode.textContent = ticket;
                ticketsNode.appendChild(document.createTextNode('\n      '));
                ticketsNode.appendChild(jiraNode);
            });
            ticketsNode.appendChild(document.createTextNode('\n    '));
            fieldNode.appendChild(document.createTextNode('\n    '));
            fieldNode.appendChild(ticketsNode);
        }

        // Handle mapped data
        if (updatedField.mappingType === 'MAPPED' && updatedField.mappedData) {
            updateMappedNode(fieldNode, updatedField.mappedData);
        }

        // Update other fields
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

    function updateMappedNode(fieldNode, mappedData) {
        // Remove existing mapping structures
        ['ifelse', 'ctable'].forEach(tag => {
            Array.from(fieldNode.getElementsByTagName(tag)).forEach(node => node.remove());
        });

        if (mappedData.type === 'conditional') {
            const ifelseNode = fieldNode.ownerDocument.createElement('ifelse');
            mappedData.mappings.forEach(condition => {
                const ifNode = createConditionalMapping(fieldNode.ownerDocument, condition);
                ifelseNode.appendChild(ifNode);
            });
            fieldNode.appendChild(ifelseNode);
        } else {
            const ctableNode = createDirectMapping(fieldNode.ownerDocument, mappedData);
            fieldNode.appendChild(ctableNode);
        }
    }

    function createConditionalMapping(doc, condition) {
        const ifNode = doc.createElement('if');
        const refNode = doc.createElement('ref');
        refNode.textContent = condition.ref;
        ifNode.appendChild(refNode);

        const ctableNode = doc.createElement('ctable');
        const colsNode = doc.createElement('cols');
        condition.sources.forEach(src => {
            const srcNode = doc.createElement('src');
            srcNode.textContent = src;
            colsNode.appendChild(srcNode);
        });
        ctableNode.appendChild(colsNode);

        condition.rows.forEach(row => {
            const rowNode = doc.createElement('row');
            row.forEach(value => {
                const valueNode = doc.createElement('value');
                valueNode.textContent = value;
                rowNode.appendChild(valueNode);
            });
            ctableNode.appendChild(rowNode);
        });

        ifNode.appendChild(ctableNode);
        return ifNode;
    }

    function createDirectMapping(doc, mappedData) {
        const ctableNode = doc.createElement('ctable');
        const colsNode = doc.createElement('cols');
        mappedData.sources.forEach(src => {
            const srcNode = doc.createElement('src');
            srcNode.textContent = src;
            colsNode.appendChild(srcNode);
        });
        ctableNode.appendChild(colsNode);

        mappedData.mappings.forEach(row => {
            const rowNode = doc.createElement('row');
            row.forEach(value => {
                const valueNode = doc.createElement('value');
                valueNode.textContent = value;
                rowNode.appendChild(valueNode);
            });
            ctableNode.appendChild(rowNode);
        });

        return ctableNode;
    }

    function formatXML(xml) {
        let formatted = '';
        let indent = '';
        let inComment = false;

        const lines = xml.split(/>\s*</);
        lines.forEach((line, index) => {
            if (line.includes('<!--')) inComment = true;
            if (line.includes('-->')) inComment = false;

            if (index !== 0) line = '<' + line;
            if (index !== lines.length-1) line = line + '>';

            if (!inComment) {
                if (line.includes('</')) indent = indent.slice(2);
                formatted += indent + line + '\n';
                if (!line.includes('</') && !line.includes('/>')) indent += '  ';
            } else {
                formatted += indent + line + '\n';
            }
        });

        return formatted;
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