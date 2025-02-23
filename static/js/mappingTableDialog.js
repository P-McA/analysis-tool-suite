// Constants for operators
const OPERATORS = ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS', 'NOT_CONTAINS', 'IN'];

// Utility function to measure text width
function measureTextWidth(text, font = '16px Arial') {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = font; // Match the font used in your inputs
    return context.measureText(text).width + 10; // Add padding (e.g., 10px)
}

// Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('React Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return React.createElement('div', { className: 'p-4 text-red-600' },
                'Something went wrong with the dialog. Please try again.');
        }
        return this.props.children;
    }
}

// Condition Component for DERIVED mapping type
const Condition = ({ condition, onUpdate, onRemove, index }) => {
    return React.createElement('div', { className: 'flex gap-2 items-center mb-2' },
        React.createElement('input', {
            type: 'text',
            value: condition.src || '',
            onChange: (e) => onUpdate(index, 'src', e.target.value),
            placeholder: 'Source Field',
            className: 'flex-1 p-2 border rounded'
        }),
        React.createElement('select', {
            value: condition.oper || 'EQUALS',
            onChange: (e) => onUpdate(index, 'oper', e.target.value),
            className: 'p-2 border rounded'
        }, OPERATORS.map(op =>
            React.createElement('option', { key: op, value: op }, op)
        )),
        React.createElement('input', {
            type: 'text',
            value: condition.value || '',
            onChange: (e) => onUpdate(index, 'value', e.target.value),
            placeholder: 'Value',
            className: 'flex-1 p-2 border rounded'
        }),
        React.createElement('button', {
            onClick: () => onRemove(index),
            className: 'px-3 py-2 text-red-600 hover:text-red-800'
        }, '×')
    );
};

// Mapping Row Component for MAPPED mapping type with dynamic widths
const MappingRow = ({ mapping, index, onUpdate, onRemove, allMappings }) => {
    const fromInputRef = React.useRef(null);
    const toInputRef = React.useRef(null);

    // Calculate the longest text width among all mappings
    React.useEffect(() => {
        if (!allMappings || allMappings.length === 0) return;

        // Get all values from all mappings
        const allValues = allMappings.flatMap(m => [
            m.from || '',
            m.to || ''
        ]);

        // Find the longest text
        const longestText = allValues.reduce((longest, current) =>
            current.length > longest.length ? current : longest, '');

        // Measure the width
        const maxWidth = measureTextWidth(longestText, '16px Arial');

        // Apply the width to inputs
        if (fromInputRef.current) {
            fromInputRef.current.style.width = `${maxWidth}px`;
        }
        if (toInputRef.current) {
            toInputRef.current.style.width = `${maxWidth}px`;
        }
    }, [allMappings]);

    return React.createElement('tr', null,
        React.createElement('td', { className: 'border px-4 py-2' },
            React.createElement('input', {
                ref: fromInputRef,
                type: 'text',
                value: mapping.from || '',
                onChange: (e) => onUpdate(index, 'from', e.target.value),
                placeholder: 'Value',
                className: 'p-2 border rounded'
            })
        ),
        React.createElement('td', { className: 'border px-4 py-2' },
            React.createElement('input', {
                ref: toInputRef,
                type: 'text',
                value: mapping.to || '',
                onChange: (e) => onUpdate(index, 'to', e.target.value),
                placeholder: 'Mapped Value',
                className: 'p-2 border rounded'
            })
        ),
        React.createElement('td', { className: 'border px-4 py-2 text-center' },
            React.createElement('button', {
                onClick: () => onRemove(index),
                className: 'text-red-600 hover:text-red-800'
            }, 'Remove')
        )
    );
};

// Main Dialog Component
const MappingTableDialog = ({ isOpen, onClose, mappingType, initialData, onSave }) => {
    const [data, setData] = React.useState(() => {
        if (mappingType === 'MAPPED') {
            return {
                src: initialData?.src || '',
                mappings: initialData?.mappings || []
            };
        }
        return {
            conditions: initialData?.conditions || [],
            value: initialData?.value || ''
        };
    });

    if (!isOpen) return null;

    const renderDerivedContent = () => {
        const addCondition = () => {
            setData({
                ...data,
                conditions: [...data.conditions, { src: '', oper: 'EQUALS', value: '' }]
            });
        };

        const updateCondition = (index, field, value) => {
            const newConditions = [...data.conditions];
            newConditions[index] = { ...newConditions[index], [field]: value };
            setData({ ...data, conditions: newConditions });
        };

        const removeCondition = (index) => {
            setData({
                ...data,
                conditions: data.conditions.filter((_, i) => i !== index)
            });
        };

        return React.createElement('div', { className: 'space-y-6' },
            React.createElement('div', null,
                React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Conditions'),
                React.createElement('div', { className: 'space-y-2' },
                    data.conditions.map((condition, index) =>
                        React.createElement(Condition, {
                            key: index,
                            condition,
                            index,
                            onUpdate: updateCondition,
                            onRemove: removeCondition
                        })
                    )
                ),
                React.createElement('button', {
                    onClick: addCondition,
                    className: 'mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100'
                }, 'Add Condition')
            ),
            React.createElement('div', null,
                React.createElement('label', { className: 'block font-medium mb-2' }, 'Result Value'),
                React.createElement('input', {
                    type: 'text',
                    value: data.value,
                    onChange: (e) => setData({ ...data, value: e.target.value }),
                    className: 'w-full p-2 border rounded',
                    placeholder: 'Enter result value'
                })
            )
        );
    };

    const renderMappedContent = () => {
        const addMapping = () => {
            setData({
                ...data,
                mappings: [...data.mappings, { from: '', to: '' }]
            });
        };

        const updateMapping = (index, field, value) => {
            const newMappings = [...data.mappings];
            newMappings[index] = { ...newMappings[index], [field]: value };
            setData({ ...data, mappings: newMappings });
        };

        const removeMapping = (index) => {
            setData({
                ...data,
                mappings: data.mappings.filter((_, i) => i !== index)
            });
        };

        return React.createElement('div', { className: 'space-y-6' },
            React.createElement('div', null,
                React.createElement('label', { className: 'block font-medium mb-2' }, 'Source Field'),
                React.createElement('input', {
                    type: 'text',
                    value: data.src,
                    onChange: (e) => setData({ ...data, src: e.target.value }),
                    className: 'w-full p-2 border rounded',
                    placeholder: 'Enter source field path'
                })
            ),
            React.createElement('div', null,
                React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Value Mappings'),
                React.createElement('table', { className: 'w-full border-collapse' },
                    React.createElement('thead',
                        React.createElement('tr', { className: 'bg-gray-50' },
                            React.createElement('th', { className: 'border px-4 py-2 text-left' }, 'From'),
                            React.createElement('th', { className: 'border px-4 py-2 text-left' }, 'To'),
                            React.createElement('th', { className: 'border px-4 py-2 w-24' }, 'Actions')
                        )
                    ),
                    React.createElement('tbody', null,
                        data.mappings.map((mapping, index) =>
                            React.createElement(MappingRow, {
                                key: index,
                                mapping,
                                index,
                                onUpdate: updateMapping,
                                onRemove: removeMapping,
                                allMappings: data.mappings // Pass all mappings to calculate longest width
                            })
                        )
                    )
                ),
                React.createElement('button', {
                    onClick: addMapping,
                    className: 'mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100'
                }, 'Add Mapping')
            )
        );
    };

    return React.createElement('div', {
        className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'
    },
        React.createElement('div', {
            className: 'bg-white rounded-lg shadow-xl w-full max-w-4xl'
        },
            React.createElement('div', {
                className: 'flex justify-between items-center p-6 border-b'
            },
                React.createElement('h2', {
                    className: 'text-xl font-semibold'
                }, mappingType === 'DERIVED' ? 'Derived Mapping Configuration' : 'Value Mapping Configuration'),
                React.createElement('button', {
                    onClick: onClose,
                    className: 'text-gray-500 hover:text-gray-700'
                }, '×')
            ),
            React.createElement('div', {
                className: 'p-6'
            }, mappingType === 'DERIVED' ? renderDerivedContent() : renderMappedContent()),
            React.createElement('div', {
                className: 'flex justify-end gap-4 p-6 border-t bg-gray-50'
            },
                React.createElement('button', {
                    onClick: onClose,
                    className: 'px-4 py-2 border rounded hover:bg-gray-100'
                }, 'Cancel'),
                React.createElement('button', {
                    onClick: () => onSave(data),
                    className: 'px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
                }, 'Save Changes')
            )
        )
    );
};

// Export components
window.ErrorBoundary = ErrorBoundary;
window.MappingTableDialog = MappingTableDialog;