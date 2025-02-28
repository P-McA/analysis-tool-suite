// FilterBar.js
const FilterBar = () => {
    const [filters, setFilters] = React.useState({
        fieldName: [], // Array to store multiple selected field names
        mappingType: '',
        status: '',
        notes: '',
        tickets: ''
    });

    const [totalRecords, setTotalRecords] = React.useState(0);
    const [filteredRecords, setFilteredRecords] = React.useState(0);

    // Get unique field names from currentMapping for the dropdown options
    const fieldNames = React.useMemo(() => {
        const mappings = window.getCurrentMapping?.() || [];
        const uniqueFieldNames = [...new Set(mappings.map(mapping => mapping.fieldName))].filter(Boolean);
        return uniqueFieldNames.sort();
    }, []);

    const handleFilterChange = (field, value) => {
        const newFilters = {
            ...filters,
            [field]: value
        };
        setFilters(newFilters);
        window.handleFilterChange(newFilters);
    };

    const handleFieldNameChange = (event) => {
        const selectedOptions = Array.from(event.target.selectedOptions, option => option.value);
        handleFilterChange('fieldName', selectedOptions);
    };

    const clearFilters = () => {
        const emptyFilters = {
            fieldName: [],
            mappingType: '',
            status: '',
            notes: '',
            tickets: ''
        };
        setFilters(emptyFilters);
        window.handleFilterChange(emptyFilters);
    };

    const mappingTypes = [
        'AGGREGATED',
        'DEFAULTED',
        'DERIVED',
        'ENRICHED',
        'FORMATTED',
        'MAPPED',
        'PASSED_THROUGH',
        'NONE'
    ];

    const statusTypes = ['GOOD', 'BAD', 'PENDING'];

    // Update record counts when filters change
    React.useEffect(() => {
        const mappings = window.getCurrentMapping?.() || [];
        setTotalRecords(mappings.length);
        const filtered = applyLocalFilters(mappings, filters);
        setFilteredRecords(filtered.length);
    }, [filters]);

    // Local filter function to count filtered records (simulates applyFilters)
    const applyLocalFilters = (mappings, filters) => {
        let filtered = [...mappings];

        if (filters.fieldName.length > 0) {
            filtered = filtered.filter(mapping =>
                filters.fieldName.includes(mapping.fieldName)
            );
        }

        if (filters.mappingType) {
            filtered = filtered.filter(mapping =>
                mapping.mappingType === filters.mappingType
            );
        }

        if (filters.status) {
            filtered = filtered.filter(mapping =>
                mapping.status === filters.status
            );
        }

        if (filters.notes) {
            filtered = filtered.filter(mapping =>
                mapping.notes.toLowerCase().includes(filters.notes.toLowerCase())
            );
        }

        if (filters.tickets) {
            filtered = filtered.filter(mapping =>
                mapping.tickets.toLowerCase().includes(filters.tickets.toLowerCase())
            );
        }

        return filtered;
    };

    return (
        <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700">Filter Mappings</h3>
                <div className="text-sm text-gray-500">
                    {filteredRecords} of {totalRecords} records shown
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Field Name Filter (Multi-Select) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Field Name
                    </label>
                    <select
                        multiple
                        value={filters.fieldName}
                        onChange={handleFieldNameChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        {fieldNames.map(fieldName => (
                            <option key={fieldName} value={fieldName}>
                                {fieldName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Mapping Type Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mapping Type
                    </label>
                    <select
                        value={filters.mappingType}
                        onChange={(e) => handleFilterChange('mappingType', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Types</option>
                        {mappingTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                {/* Status Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                    </label>
                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Status</option>
                        {statusTypes.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                {/* Notes Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                    </label>
                    <input
                        type="text"
                        value={filters.notes}
                        onChange={(e) => handleFilterChange('notes', e.target.value)}
                        placeholder="Search in notes..."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Tickets Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tickets
                    </label>
                    <input
                        type="text"
                        value={filters.tickets}
                        onChange={(e) => handleFilterChange('tickets', e.target.value)}
                        placeholder="Search tickets..."
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end mt-4">
                <button
                    onClick={clearFilters}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                    Clear Filters
                </button>
            </div>

            {/* Active Filters Display */}
            <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(filters).map(([key, value]) => {
                    if (!value || (Array.isArray(value) && value.length === 0)) return null;
                    return (
                        <div
                            key={key}
                            className="inline-flex items-center bg-blue-50 text-blue-700 rounded-full px-3 py-1 text-sm"
                        >
                            <span className="font-medium mr-1">
                                {key.charAt(0).toUpperCase() + key.slice(1)}:
                            </span>
                            {Array.isArray(value) ? value.join(', ') : value}
                            <button
                                onClick={() => handleFilterChange(key, Array.isArray(value) ? [] : '')}
                                className="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
                            >
                                ×
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Make the component available globally
window.FilterBar = FilterBar;