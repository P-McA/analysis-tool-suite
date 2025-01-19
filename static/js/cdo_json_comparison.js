// Disable Dropzone auto discover
Dropzone.autoDiscover = false;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables to store the files and exclusions
    let file1 = null;
    let file2 = null;
    let exclusionList = new Set();
    let currentDifferenceData = null;

    // Initialize dropzones
    const dropzone1 = new Dropzone("#dropzone1", {
        url: "/compare_json",
        autoProcessQueue: false,
        maxFiles: 1,
        acceptedFiles: ".json",
        addRemoveLinks: true,
        clickable: true,
        createImageThumbnails: false,
        dictDefaultMessage: "Drop first JSON file here or click to upload"
    });

    const dropzone2 = new Dropzone("#dropzone2", {
        url: "/compare_json",
        autoProcessQueue: false,
        maxFiles: 1,
        acceptedFiles: ".json",
        addRemoveLinks: true,
        clickable: true,
        createImageThumbnails: false,
        dictDefaultMessage: "Drop second JSON file here or click to upload"
    });

    // Handle file additions
    dropzone1.on("addedfile", function(file) {
        if (file1) dropzone1.removeFile(file1);
        file1 = file;
        checkCompareButton();
    });

    dropzone2.on("addedfile", function(file) {
        if (file2) dropzone2.removeFile(file2);
        file2 = file;
        checkCompareButton();
    });

    // Handle file removals
    dropzone1.on("removedfile", function(file) {
        file1 = null;
        checkCompareButton();
    });

    dropzone2.on("removedfile", function(file) {
        file2 = null;
        checkCompareButton();
    });

    // Enable/disable compare button based on file presence
    function checkCompareButton() {
        const compareButton = document.getElementById('compareButton');
        if (file1 && file2) {
            compareButton.removeAttribute('disabled');
        } else {
            compareButton.setAttribute('disabled', 'disabled');
        }
    }

    // Handle the compare button click
    document.getElementById('compareButton').addEventListener('click', function() {
        if (!file1 || !file2) {
            alert('Please upload both JSON files first');
            return;
        }

        const formData = new FormData();
        formData.append('file1', file1);
        formData.append('file2', file2);

        // Show loading state
        this.setAttribute('disabled', 'disabled');
        this.textContent = 'Comparing...';

        fetch('/compare_json', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            displayResults(data);
        })
        .catch(error => {
            alert('Error comparing files: ' + error.message);
        })
        .finally(() => {
            // Reset button state
            this.removeAttribute('disabled');
            this.textContent = 'Compare';
        });
    });

    function displayResults(data) {
        // Show the results section
        document.getElementById('results').style.display = 'block';

        // Update file names in headers
        document.getElementById('only-in-1-title').textContent = `Only in ${data.file1_name}`;
        document.getElementById('only-in-2-title').textContent = `Only in ${data.file2_name}`;
        document.getElementById('file1-header').textContent = data.file1_name;
        document.getElementById('file2-header').textContent = data.file2_name;

        displayStructureDifferences(data);
        displayValueDifferences(data);
    }

    function displayStructureDifferences(data) {
        const onlyIn1List = document.getElementById('only-in-1-list');
        const onlyIn2List = document.getElementById('only-in-2-list');

        onlyIn1List.innerHTML = '';
        onlyIn2List.innerHTML = '';

        if (data.only_in_1.length === 0) {
            const li = document.createElement('li');
            li.className = 'list-group-item text-muted';
            li.textContent = 'No unique fields';
            onlyIn1List.appendChild(li);
        } else {
            data.only_in_1.forEach(path => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = path;
                onlyIn1List.appendChild(li);
            });
        }

        if (data.only_in_2.length === 0) {
            const li = document.createElement('li');
            li.className = 'list-group-item text-muted';
            li.textContent = 'No unique fields';
            onlyIn2List.appendChild(li);
        } else {
            data.only_in_2.forEach(path => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = path;
                onlyIn2List.appendChild(li);
            });
        }
    }

    function displayValueDifferences(data) {
    currentDifferenceData = data;
    const tbody = document.getElementById('value-differences-body');
    tbody.innerHTML = '';

    if (!data.different_values || data.different_values.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.className = 'text-center text-muted';
        cell.textContent = 'No value differences found';
        return;
    }

    const showAllChecked = document.getElementById('showAllFields').checked;
    const removeUniqueChecked = document.getElementById('removeUniqueFields').checked;

    // Create case-insensitive version of uniqueFields list
    const uniqueFieldsLower = window.uniqueFieldsConfig.uniqueFields.map(field => field.toLowerCase());

    data.different_values.forEach(diff => {
        // Skip excluded fields unless "Show All" is checked
        if (exclusionList.has(diff.path) && !showAllChecked) {
            return;
        }

        // Case insensitive check for unique fields
        if (removeUniqueChecked && uniqueFieldsLower.includes(diff.path.toLowerCase())) {
            return;
        }

        // Create table row
        const row = tbody.insertRow();

        // Path cell
        const pathCell = row.insertCell();
        pathCell.className = 'font-monospace';
        pathCell.textContent = diff.path;

        // Value 1 cell
        const value1Cell = row.insertCell();
        value1Cell.className = 'font-monospace';
        value1Cell.innerHTML = `<pre class="m-0"><code>${formatValue(diff.value1)}</code></pre>`;

        // Value 2 cell
        const value2Cell = row.insertCell();
        value2Cell.className = 'font-monospace';
        value2Cell.innerHTML = `<pre class="m-0"><code>${formatValue(diff.value2)}</code></pre>`;

        // Exclusion checkbox cell
        const checkboxCell = row.insertCell();
        checkboxCell.className = 'text-center';

        // Create checkbox
        const checkbox = document.createElement('input');
        checkbox.setAttribute('type', 'checkbox');
        checkbox.className = 'form-check-input mt-0';
        checkbox.style.cursor = 'pointer';
        checkbox.checked = exclusionList.has(diff.path);

        // Add event listener
        checkbox.addEventListener('change', function(e) {
            const isChecked = e.target.checked;
            if (isChecked) {
                exclusionList.add(diff.path);
                console.log('Field excluded:', diff.path);
                logExcludedFields();
                if (!showAllChecked) {
                    row.remove();
                }
            } else {
                exclusionList.delete(diff.path);
                console.log('Field un-excluded:', diff.path);
                logExcludedFields();
            }
        });

        // Add checkbox to cell
        checkboxCell.appendChild(checkbox);
    });
}

    function formatValue(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        return String(value);
    }

    function logExcludedFields() {
        console.log('Current excluded fields:', Array.from(exclusionList));
    }

    // Handle "Show All Fields" checkbox
    document.getElementById('showAllFields').addEventListener('change', function() {
        if (currentDifferenceData) {
            displayValueDifferences(currentDifferenceData);
        }
    });

    // Handle "Remove Unique Fields" checkbox
    document.getElementById('removeUniqueFields').addEventListener('change', function() {
        if (currentDifferenceData) {
            displayValueDifferences(currentDifferenceData);
        }
    });
});