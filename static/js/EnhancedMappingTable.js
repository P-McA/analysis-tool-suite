// EnhancedMappingTable.js with performance optimizations and render cycle fixes
const EnhancedMappingTable = () => {
    const [sortField, setSortField] = React.useState('fieldName');
    const [sortDirection, setSortDirection] = React.useState('asc');
    const [updateTimestamp, setUpdateTimestamp] = React.useState(Date.now());

    // Reference to track if we're in the middle of an update
    const isUpdating = React.useRef(false);

    // Keep a local copy of mappings to avoid frequent calls to window.getCurrentMapping
    const [localMappings, setLocalMappings] = React.useState([]);

    // Filter state
    const [filterPopoverOpen, setFilterPopoverOpen] = React.useState(null);
    const [filters, setFilters] = React.useState({
        fieldName: [],
        mappingType: '',
        status: '',
        tickets: ''
    });

    // Filter options
    const [filterOptions, setFilterOptions] = React.useState({
        fieldName: [],
        mappingType: ['AGGREGATED', 'DEFAULTED', 'DERIVED', 'ENRICHED', 'FORMATTED', 'MAPPED', 'PASSED_THROUGH', 'NONE'],
        status: ['GOOD', 'BAD', 'PENDING']
    });

    // Safely get current mappings and update local state
    const refreshMappings = React.useCallback(() => {
        try {
            if (isUpdating.current) return; // Prevent recursive updates

            isUpdating.current = true;
            const currentMappings = window.getCurrentMapping?.() || [];

            // Only update if mappings have actually changed
            // This performs a shallow comparison to prevent unnecessary rerenders
            const shouldUpdate = !areMappingsEqual(localMappings, currentMappings);

            if (shouldUpdate) {
                console.log("Updating local mappings");
                setLocalMappings(currentMappings);
            }

            isUpdating.current = false;
        } catch (error) {
            console.error("Error refreshing mappings:", error);
            isUpdating.current = false;
        }
    }, [localMappings]);

    // Compare mappings arrays to prevent unnecessary updates
    const areMappingsEqual = (mappingsA, mappingsB) => {
        if (!mappingsA || !mappingsB) return false;
        if (mappingsA.length !== mappingsB.length) return false;

        // Simple length check is often enough, but we could do deeper comparison if needed
        return true;
    };

    // Safe wrapper for forceUpdate that prevents update loops
    const safeForceUpdate = React.useCallback((timestamp) => {
        if (isUpdating.current) return; // Prevent recursive updates

        if (!timestamp || timestamp === updateTimestamp) return;

        isUpdating.current = true;
        setUpdateTimestamp(timestamp);
        refreshMappings();
        isUpdating.current = false;
    }, [updateTimestamp, refreshMappings]);

    // Register force update function - with dependencies array to prevent constant recreation
    React.useEffect(() => {
        console.log("Registering forceUpdate in EnhancedMappingTable");

        if (window.setForceUpdate) {
            window.setForceUpdate(safeForceUpdate);
        }

        // Initial load of mappings
        refreshMappings();

        return () => {
            console.log("Cleaning up forceUpdate");
            if (window.setForceUpdate) {
                window.setForceUpdate(null);
            }
        };
    }, [safeForceUpdate, refreshMappings]);

    // Update filter options when mappings change - but only extract field names once per mapping set
    React.useEffect(() => {
        // Extract unique field names for filter options
        const fieldNames = [...new Set(localMappings.map(m => m.fieldName))]
            .filter(Boolean)
            .sort();

        setFilterOptions(prev => ({
            ...prev,
            fieldName: fieldNames
        }));
    }, [localMappings]);

    // Function to check if a mapping is newly added (within the last 5 seconds)
    const isNewlyAdded = React.useCallback((mapping) => {
        if (!mapping || !mapping.fieldName) return false;
        const matches = mapping.fieldName.match(/NewField_(\d+)/);
        if (!matches || matches.length < 2) return false;

        const timestamp = parseInt(matches[1], 10);
        const now = Date.now();
        return now - timestamp < 5000; // 5 seconds threshold
    }, []);

    // Apply filters to mappings but always include newly added rows
    // Wrapped in useMemo to prevent recalculation on every render
    const filteredMappings = React.useMemo(() => {
        if (!localMappings || !Array.isArray(localMappings)) {
            console.warn("Invalid mappings data:", localMappings);
            return [];
        }

        let result = [...localMappings];

        // Find any newly added mappings
        const newlyAddedMappings = result.filter(isNewlyAdded);

        // Apply field name filter
        if (filters.fieldName.length > 0) {
            result = result.filter(mapping =>
                filters.fieldName.includes(mapping.fieldName) || isNewlyAdded(mapping)
            );
        }

        // Apply mapping type filter
        if (filters.mappingType) {
            result = result.filter(mapping =>
                mapping.mappingType === filters.mappingType || isNewlyAdded(mapping)
            );
        }

        // Apply status filter
        if (filters.status) {
            result = result.filter(mapping =>
                mapping.status === filters.status || isNewlyAdded(mapping)
            );
        }

        // Apply tickets filter
        if (filters.tickets) {
            result = result.filter(mapping =>
                (mapping.tickets && mapping.tickets.toLowerCase().includes(filters.tickets.toLowerCase())) ||
                isNewlyAdded(mapping)
            );
        }

        // If we didn't retain newly added mappings through normal filtering,
        // make sure to add them back
        const filteredIds = new Set(result.map(m => m.fieldName));
        const missingNewMappings = newlyAddedMappings.filter(m => !filteredIds.has(m.fieldName));

        return [...missingNewMappings, ...result];
    }, [localMappings, filters, isNewlyAdded]);

    // Sort mappings based on current sort field and direction
    // But always keep newly added rows at the top
    const sortedMappings = React.useMemo(() => {
        try {
            // Safety check
            if (!filteredMappings || !Array.isArray(filteredMappings)) {
                return [];
            }

            // Split mappings into new and existing
            const newRows = filteredMappings.filter(isNewlyAdded);
            const existingRows = filteredMappings.filter(m => !isNewlyAdded(m));

            // Sort only the existing rows
            const sortedExisting = [...existingRows].sort((a, b) => {
                // Safely access properties, handling undefined values
                if (!a || !b) return 0;

                // If sortField is 'originalIndex', use that for sorting
                if (sortField === 'originalIndex') {
                    return sortDirection === 'asc'
                        ? (a.originalIndex || 0) - (b.originalIndex || 0)
                        : (b.originalIndex || 0) - (a.originalIndex || 0);
                }

                // Otherwise use regular string/value comparison
                let aValue = a[sortField] || '';
                let bValue = b[sortField] || '';
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();
                const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
                return sortDirection === 'asc' ? comparison : -comparison;
            });

            // Combine with new rows at the top
            return [...newRows, ...sortedExisting];
        } catch (error) {
            console.error("Error sorting mappings:", error);
            return filteredMappings || [];
        }
    }, [filteredMappings, sortField, sortDirection, isNewlyAdded]);

    const handleSort = (field) => {
        console.log("Sorting by field:", field);
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const renderSortIndicator = (field) => {
        if (sortField !== field) return null;
        return <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
    };

    const handleFilterClick = (field) => {
        setFilterPopoverOpen(filterPopoverOpen === field ? null : field);
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            fieldName: [],
            mappingType: '',
            status: '',
            tickets: ''
        });
    };

    // Safe deleteClick handler with error catching
    const handleDeleteClick = (index) => {
        console.log("Delete clicked for index:", index);
        try {
            if (typeof window.handleMappingDelete === 'function') {
                window.handleMappingDelete(index);
            } else {
                console.warn("handleMappingDelete function not available");
            }
        } catch (error) {
            console.error("Error during delete operation:", error);
        }
    };

    // Safe inputChange handler with error catching
    const handleInputChange = (index, field, value) => {
        console.log("Input change:", { index, field, value });
        try {
            if (typeof window.handleMappingUpdate === 'function') {
                window.handleMappingUpdate(index, field, value);
            } else {
                console.warn("handleMappingUpdate function not available");
            }
        } catch (error) {
            console.error("Error updating mapping:", error);
        }
    };

    const renderMappedValuesGrid = (mapping) => {
    if (!mapping || !mapping.mappedValues?.mappings?.length) return null;

    // Check if this is a multi-column mapping
    const isMultiColumn = Array.isArray(mapping.mappedValues.src);

    return (
        <div className="mt-2 bg-gray-50 p-2 rounded">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr>
                        {isMultiColumn ? (
                            // For multi-column, show all source column headers
                            mapping.mappedValues.src.map((src, idx) => (
                                <th key={idx} className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                    {src}
                                </th>
                            ))
                        ) : (
                            // For traditional, show From/To headers
                            <>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">From Value</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">To Value</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {mapping.mappedValues.mappings.map((map, idx) => (
                        <tr key={idx}>
                            {isMultiColumn ? (
                                // For multi-column, display each source's value
                                mapping.mappedValues.src.map((src, colIdx) => (
                                    <td key={colIdx} className="px-3 py-2 text-sm">
                                        {map[src] || ''}
                                    </td>
                                ))
                            ) : (
                                // For traditional, display from/to values
                                <>
                                    <td className="px-3 py-2 text-sm">{map.from}</td>
                                    <td className="px-3 py-2 text-sm">
                                        {Array.isArray(map.to) ? map.to.join(', ') : map.to}
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

    const renderSourceCell = (mapping, index) => {
        if (!mapping) return <span className="text-gray-500">Invalid mapping</span>;

        try {
            switch (mapping.mappingType) {
                case 'PASSED_THROUGH':
                case 'DEFAULTED':
                    return (
                        <input
                            type="text"
                            value={mapping.source || ''}
                            onChange={(e) => handleInputChange(index, 'source', e.target.value)}
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter source field"
                        />
                    );
                case 'MAPPED':
                    return (
                        <div>
                            <div className="flex items-center mb-2">
                                <span className="text-sm text-gray-600">
                                    Mappings ({mapping.mappedValues?.mappings?.length || 0})
                                </span>
                                <button
                                    onClick={() => {
                                        try {
                                            if (typeof window.showMappedDialog === 'function') {
                                                window.showMappedDialog(mapping, index);
                                            } else {
                                                console.warn("showMappedDialog function not available");
                                            }
                                        } catch (error) {
                                            console.error("Error opening mapped dialog:", error);
                                        }
                                    }}
                                    className="ml-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                                >
                                    Edit
                                </button>
                            </div>
                            {renderMappedValuesGrid(mapping)}
                        </div>
                    );
                case 'DERIVED':
                    return (
                        <button
                            onClick={() => {
                                try {
                                    if (typeof window.showDerivedMappingDialog === 'function') {
                                        window.showDerivedMappingDialog(mapping, index);
                                    } else {
                                        console.warn("showDerivedMappingDialog function not available");
                                    }
                                } catch (error) {
                                    console.error("Error opening derived dialog:", error);
                                }
                            }}
                            className="w-full px-4 py-2 text-left bg-gray-50 hover:bg-gray-100 rounded border"
                        >
                            <i className="fas fa-code mr-2"></i>
                            Edit Logic
                            {mapping.derivedMapping?.conditions?.length > 0 && (
                                <span className="ml-2 text-xs text-gray-500">
                                    ({mapping.derivedMapping.conditions.length} conditions)
                                </span>
                            )}
                        </button>
                    );
                default:
                    return <span className="text-gray-500">N/A</span>;
            }
        } catch (error) {
            console.error("Error rendering source cell:", error);
            return <span className="text-red-500">Error rendering content</span>;
        }
    };

    // Render filter popover for a column
    const renderFilterPopover = (field) => {
        if (filterPopoverOpen !== field) return null;

        const options = filterOptions[field] || [];
        const currentFilter = filters[field];

        // Special case for tickets which is a text search field
        if (field === 'tickets') {
            return (
                <div className="absolute z-10 mt-2 w-56 p-2 bg-white rounded-md shadow-lg border border-gray-200">
                    <div className="mb-2 flex justify-between items-center">
                        <h4 className="text-sm font-medium">Filter by {field}</h4>
                        <button
                            onClick={() => setFilterPopoverOpen(null)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <div>
                        <input
                            type="text"
                            value={filters.tickets}
                            onChange={(e) => handleFilterChange('tickets', e.target.value)}
                            placeholder="Search in tickets..."
                            className="w-full p-2 border rounded"
                        />
                    </div>

                    <div className="mt-2 pt-2 border-t flex justify-between">
                        <button
                            onClick={() => handleFilterChange('tickets', '')}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => setFilterPopoverOpen(null)}
                            className="text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="absolute z-10 mt-2 w-56 p-2 bg-white rounded-md shadow-lg border border-gray-200">
                <div className="mb-2 flex justify-between items-center">
                    <h4 className="text-sm font-medium">Filter by {field}</h4>
                    <button
                        onClick={() => setFilterPopoverOpen(null)}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {field === 'fieldName' ? (
                    // Checkbox list for fieldName (multiple selection)
                    <div className="max-h-60 overflow-y-auto">
                        {options.map(option => (
                            <label key={option} className="flex items-center py-1">
                                <input
                                    type="checkbox"
                                    checked={filters.fieldName.includes(option)}
                                    onChange={(e) => {
                                        const newFieldNames = e.target.checked
                                            ? [...filters.fieldName, option]
                                            : filters.fieldName.filter(f => f !== option);
                                        handleFilterChange('fieldName', newFieldNames);
                                    }}
                                    className="mr-2"
                                />
                                <span className="text-sm">{option}</span>
                            </label>
                        ))}
                    </div>
                ) : (
                    // Radio buttons for other fields (single selection)
                    <div>
                        <label className="flex items-center py-1">
                            <input
                                type="radio"
                                checked={!currentFilter}
                                onChange={() => handleFilterChange(field, '')}
                                className="mr-2"
                            />
                            <span className="text-sm">All</span>
                        </label>
                        {options.map(option => (
                            <label key={option} className="flex items-center py-1">
                                <input
                                    type="radio"
                                    checked={currentFilter === option}
                                    onChange={() => handleFilterChange(field, option)}
                                    className="mr-2"
                                />
                                <span className="text-sm">{option}</span>
                            </label>
                        ))}
                    </div>
                )}

                <div className="mt-2 pt-2 border-t flex justify-between">
                    <button
                        onClick={() => field === 'fieldName'
                            ? handleFilterChange(field, [])
                            : handleFilterChange(field, '')
                        }
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        Clear
                    </button>
                    <button
                        onClick={() => setFilterPopoverOpen(null)}
                        className="text-sm bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                    >
                        Apply
                    </button>
                </div>
            </div>
        );
    };

    // Render active filter indicators for a column
    const renderFilterIndicator = (field) => {
        const isFiltered = field === 'fieldName'
            ? filters[field].length > 0
            : Boolean(filters[field]);

        if (!isFiltered) return null;

        return (
            <span className="ml-1 text-blue-600">
                <i className="fas fa-filter"></i>
            </span>
        );
    };

    // Render a row with highlight if it's newly added
    const renderRow = (mapping, index, originalIndex) => {
        try {
            if (!mapping) return null;

            const isNew = isNewlyAdded(mapping);

            return (
                <tr key={index} className={`hover:bg-gray-50 ${isNew ? 'bg-blue-50' : ''}`}>
                    <td className="px-6 py-4">
                        <input
                            type="text"
                            value={mapping.fieldName || ''}
                            onChange={(e) => handleInputChange(originalIndex, 'fieldName', e.target.value)}
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${isNew ? 'border-blue-300' : ''}`}
                        />
                    </td>
                    <td className="px-6 py-4">
                        {renderSourceCell(mapping, originalIndex)}
                    </td>
                    <td className="px-6 py-4">
                        <select
                            value={mapping.mappingType || 'NONE'}
                            onChange={(e) => handleInputChange(originalIndex, 'mappingType', e.target.value)}
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${isNew ? 'border-blue-300' : ''}`}
                        >
                            {filterOptions.mappingType.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </td>
                    <td className="px-6 py-4">
                        {/* Notes column */}
                        <input
                            type="text"
                            value={mapping.notes || ''}
                            onChange={(e) => handleInputChange(originalIndex, 'notes', e.target.value)}
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${isNew ? 'border-blue-300' : ''}`}
                            placeholder="Notes..."
                        />
                    </td>
                    <td className="px-6 py-4">
                        {/* Tickets column - ensure TicketTagsInput is defined */}
                        {window.TicketTagsInput ? (
                            <TicketTagsInput
                                tickets={mapping.tickets || ''}
                                onChange={handleInputChange}
                                index={originalIndex}
                            />
                        ) : (
                            <input
                                type="text"
                                value={mapping.tickets || ''}
                                onChange={(e) => handleInputChange(originalIndex, 'tickets', e.target.value)}
                                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${isNew ? 'border-blue-300' : ''}`}
                                placeholder="Tickets..."
                            />
                        )}
                    </td>
                    <td className="px-6 py-4">
                        <select
                            value={mapping.status || 'GOOD'}
                            onChange={(e) => handleInputChange(originalIndex, 'status', e.target.value)}
                            className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${isNew ? 'border-blue-300' : ''}`}
                        >
                            {filterOptions.status.map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                        <button
                            onClick={() => handleDeleteClick(originalIndex)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete mapping"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            );
        } catch (error) {
            console.error("Error rendering row:", error, mapping);
            return (
                <tr key={index} className="bg-red-50">
                    <td colSpan="7" className="px-6 py-4 text-center text-red-600">
                        Error rendering row: {error.message}
                    </td>
                </tr>
            );
        }
    };

    return (
        <div>
            {/* Filter status and clear button */}
            <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
                <div className="text-sm text-gray-500">
                    {sortedMappings.length} of {localMappings.length} records shown
                </div>
                {(filters.fieldName.length > 0 || filters.mappingType || filters.status || filters.tickets) && (
                    <button
                        onClick={clearFilters}
                        className="px-3 py-1 text-sm text-gray-600 bg-white border rounded-md hover:bg-gray-50"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Active filters display */}
            {(filters.fieldName.length > 0 || filters.mappingType || filters.status || filters.tickets) && (
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border-b">
                    {filters.fieldName.length > 0 && (
                        <div className="px-2 py-1 bg-blue-50 text-blue-800 rounded-full text-sm flex items-center">
                            <span>Field: {filters.fieldName.length === 1 ? filters.fieldName[0] : `${filters.fieldName.length} selected`}</span>
                            <button
                                onClick={() => handleFilterChange('fieldName', [])}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    {filters.mappingType && (
                        <div className="px-2 py-1 bg-blue-50 text-blue-800 rounded-full text-sm flex items-center">
                            <span>Type: {filters.mappingType}</span>
                            <button
                                onClick={() => handleFilterChange('mappingType', '')}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    {filters.status && (
                        <div className="px-2 py-1 bg-blue-50 text-blue-800 rounded-full text-sm flex items-center">
                            <span>Status: {filters.status}</span>
                            <button
                                onClick={() => handleFilterChange('status', '')}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    {filters.tickets && (
                        <div className="px-2 py-1 bg-blue-50 text-blue-800 rounded-full text-sm flex items-center">
                            <span>Tickets: "{filters.tickets}"</span>
                            <button
                                onClick={() => handleFilterChange('tickets', '')}
                                className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative"
                                onClick={() => handleSort('fieldName')}
                            >
                                <div className="flex items-center">
                                    Field Name {renderSortIndicator('fieldName')}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilterClick('fieldName');
                                        }}
                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fas fa-filter"></i>
                                        {renderFilterIndicator('fieldName')}
                                    </button>
                                </div>
                                {renderFilterPopover('fieldName')}
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                                Source
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative"
                                onClick={() => handleSort('mappingType')}
                            >
                                <div className="flex items-center">
                                    Mapping Type {renderSortIndicator('mappingType')}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilterClick('mappingType');
                                        }}
                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fas fa-filter"></i>
                                        {renderFilterIndicator('mappingType')}
                                    </button>
                                </div>
                                {renderFilterPopover('mappingType')}
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative"
                            >
                                Notes
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative"
                                onClick={() => handleSort('tickets')}
                            >
                                <div className="flex items-center">
                                    Tickets {renderSortIndicator('tickets')}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilterClick('tickets');
                                        }}
                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fas fa-filter"></i>
                                        {renderFilterIndicator('tickets')}
                                    </button>
                                </div>
                                {renderFilterPopover('tickets')}
                            </th>
                            <th
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer relative"
                                onClick={() => handleSort('status')}
                            >
                                <div className="flex items-center">
                                    Status {renderSortIndicator('status')}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFilterClick('status');
                                        }}
                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <i className="fas fa-filter"></i>
                                        {renderFilterIndicator('status')}
                                    </button>
                                </div>
                                {renderFilterPopover('status')}
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedMappings.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                                    No mappings available
                                </td>
                            </tr>
                        ) : (
                            sortedMappings.map((mapping, index) => {
                                // Find the original index safely
                                const originalIndex = Array.isArray(localMappings)
                                    ? localMappings.findIndex(m => m === mapping)
                                    : -1;

                                return renderRow(mapping, index, originalIndex >= 0 ? originalIndex : index);
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Fix missing TicketTagsInput component if not defined elsewhere
if (!window.TicketTagsInput) {
    // Simple fallback implementation
    window.TicketTagsInput = ({ tickets, onChange, index }) => {
        return (
            <input
                type="text"
                value={tickets || ''}
                onChange={(e) => onChange(index, 'tickets', e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                placeholder="Enter ticket IDs..."
            />
        );
    };
}

// Make the component available globally
window.EnhancedMappingTable = EnhancedMappingTable;