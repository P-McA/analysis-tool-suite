// Updated MappingTableDialog component with per-condition output format
const MappingTableDialog = ({ isOpen, onClose, mappingType, initialData, onSave }) => {
    const [mappedValues, setMappedValues] = React.useState({
        src: initialData?.src || '',
        mappings: initialData?.mappings || []
    });

    const [derivedMapping, setDerivedMapping] = React.useState({
        conditions: initialData?.conditions || [],
        value: initialData?.value || '',
        conditionSets: initialData?.conditionSets || []
        // Removed global outputFormat
    });

    React.useEffect(() => {
        // Initialize derived mapping with conditional sets if available
        if (mappingType === 'DERIVED' && initialData) {
            if (initialData.conditionSets && initialData.conditionSets.length > 0) {
                // Ensure each condition set has its own outputFormat
                const enhancedConditionSets = initialData.conditionSets.map(set => {
                    // Detect output format for this specific set
                    let outputFormat = 'VALUE'; // Default

                    // Look for indicators that this set uses source format
                    if (set.useSourceTag ||
                        (set.conditions.some(cond => cond.src === set.value)) ||
                        initialData.outputFormat === 'SOURCE') {
                        outputFormat = 'SOURCE';
                    }

                    return {
                        ...set,
                        outputFormat
                    };
                });

                setDerivedMapping({
                    ...derivedMapping,
                    conditionSets: enhancedConditionSets,
                    // Keep conditions for backward compatibility
                    conditions: initialData.conditions || []
                });
            } else if (initialData.conditions && initialData.conditions.length > 0) {
                // Convert old format to new format if needed
                const outputFormat = initialData.outputFormat || 'VALUE';
                const defaultSet = {
                    conditions: initialData.conditions || [],
                    value: initialData.value || '',
                    outputFormat
                };
                setDerivedMapping({
                    conditions: initialData.conditions || [],
                    value: initialData.value || '',
                    conditionSets: [defaultSet]
                });
            } else {
                // Initialize with empty condition set if nothing exists
                setDerivedMapping({
                    conditions: [],
                    value: initialData.value || '',
                    conditionSets: [{
                        conditions: [],
                        value: initialData.value || '',
                        outputFormat: 'VALUE' // Default to value
                    }]
                });
            }
        }
    }, [mappingType, initialData]);

    // Handle changing output format for a specific condition set
    const handleOutputFormatChange = (setIndex, format) => {
        const newConditionSets = [...derivedMapping.conditionSets];
        newConditionSets[setIndex].outputFormat = format;
        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });
    };

    // Handle adding mapped values
    const handleAddMapping = () => {
        setMappedValues({
            ...mappedValues,
            mappings: [...mappedValues.mappings, { from: '', to: '' }]
        });
    };

    // Handle updating mapped values
    const handleMappingChange = (index, field, value) => {
        const newMappings = [...mappedValues.mappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setMappedValues({ ...mappedValues, mappings: newMappings });
    };

    // Handle removing mapped values
    const handleRemoveMapping = (index) => {
        const newMappings = mappedValues.mappings.filter((_, i) => i !== index);
        setMappedValues({ ...mappedValues, mappings: newMappings });
    };

    // Handle source field change for mapped values
    const handleSourceChange = (e) => {
        setMappedValues({ ...mappedValues, src: e.target.value });
    };

    // Handle adding a condition to a specific condition set
    const handleAddCondition = (setIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];
        newConditionSets[setIndex].conditions = [
            ...newConditionSets[setIndex].conditions,
            { src: '', oper: 'EQUALS', value: '' }
        ];
        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    // Handle updating a condition in a condition set
    const handleConditionChange = (setIndex, condIndex, field, value) => {
        const newConditionSets = [...derivedMapping.conditionSets];
        newConditionSets[setIndex].conditions[condIndex] = {
            ...newConditionSets[setIndex].conditions[condIndex],
            [field]: value
        };

        // If in SOURCE mode and changing src field, also update result value to match
        if (newConditionSets[setIndex].outputFormat === 'SOURCE' && field === 'src') {
            newConditionSets[setIndex].value = value;
        }

        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    // Handle removing a condition from a condition set
    const handleRemoveCondition = (setIndex, condIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];
        newConditionSets[setIndex].conditions = newConditionSets[setIndex].conditions.filter((_, i) => i !== condIndex);
        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    // Handle result value change for a condition set
    const handleResultValueChange = (setIndex, value) => {
        const newConditionSets = [...derivedMapping.conditionSets];
        newConditionSets[setIndex].value = value;
        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    // Handle adding a new condition set
    const handleAddConditionSet = () => {
        setDerivedMapping({
            ...derivedMapping,
            conditionSets: [
                ...derivedMapping.conditionSets,
                {
                    conditions: [],
                    value: '',
                    outputFormat: 'VALUE' // Default to VALUE for new sets
                }
            ]
        });
    };

    // Handle removing a condition set
    const handleRemoveConditionSet = (setIndex) => {
        if (derivedMapping.conditionSets.length <= 1) {
            return; // Don't remove the last set
        }

        const newConditionSets = derivedMapping.conditionSets.filter((_, i) => i !== setIndex);
        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    // Handle saving the dialog
    const handleSave = () => {
        if (mappingType === 'MAPPED') {
            onSave(mappedValues);
        } else if (mappingType === 'DERIVED') {
            // For backward compatibility, we'll keep the old format
            // but use the new enhanced format for processing
            const enhancedDerivedMapping = {
                ...derivedMapping,
                // Update the main value and conditions from the first set for backward compatibility
                conditions: derivedMapping.conditionSets[0]?.conditions || [],
                value: derivedMapping.conditionSets[0]?.value || ''
            };
            onSave(enhancedDerivedMapping);
        }
        onClose();
    };

    // If the dialog is not open, don't render anything
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl w-full max-h-screen overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {mappingType === 'MAPPED' ? 'Mapped Values Configuration' : 'Derived Mapping Configuration'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {mappingType === 'MAPPED' && (
                    <div>
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-medium text-gray-700">
                                Source Field
                            </label>
                            <input
                                type="text"
                                value={mappedValues.src}
                                onChange={handleSourceChange}
                                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter source field"
                            />
                        </div>

                        <h3 className="text-lg font-semibold mb-2">Field Mappings</h3>

                        <div className="mb-4 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            From Value
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            To Value
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {mappedValues.mappings.map((mapping, index) => (
                                        <tr key={index}>
                                            <td className="px-6 py-2">
                                                <input
                                                    type="text"
                                                    value={mapping.from}
                                                    onChange={(e) => handleMappingChange(index, 'from', e.target.value)}
                                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                    placeholder="From Value"
                                                />
                                            </td>
                                            <td className="px-6 py-2">
                                                <input
                                                    type="text"
                                                    value={mapping.to}
                                                    onChange={(e) => handleMappingChange(index, 'to', e.target.value)}
                                                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                    placeholder="To Value"
                                                />
                                            </td>
                                            <td className="px-6 py-2 text-center">
                                                <button
                                                    onClick={() => handleRemoveMapping(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={handleAddMapping}
                            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <i className="fas fa-plus mr-2"></i>Add Mapping
                        </button>
                    </div>
                )}

                {mappingType === 'DERIVED' && (
                    <div>
                        {derivedMapping.conditionSets.map((conditionSet, setIndex) => (
                            <div
                                key={setIndex}
                                className="mb-8 p-4 border rounded-lg bg-gray-50"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">
                                        Condition Set {setIndex + 1}
                                    </h3>
                                    {derivedMapping.conditionSets.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveConditionSet(setIndex)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <i className="fas fa-times"></i> Remove Set
                                        </button>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <h4 className="text-md font-medium mb-2">Conditions</h4>
                                    {conditionSet.conditions.length === 0 ? (
                                        <div className="text-gray-500 italic mb-2">No conditions defined.</div>
                                    ) : (
                                        conditionSet.conditions.map((condition, condIndex) => (
                                            <div
                                                key={condIndex}
                                                className="flex flex-wrap gap-2 mb-3 items-center bg-white p-3 rounded border"
                                            >
                                                <input
                                                    type="text"
                                                    value={condition.src}
                                                    onChange={(e) => handleConditionChange(setIndex, condIndex, 'src', e.target.value)}
                                                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Source Field"
                                                />
                                                <select
                                                    value={condition.oper}
                                                    onChange={(e) => handleConditionChange(setIndex, condIndex, 'oper', e.target.value)}
                                                    className="p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="EQUALS">EQUALS</option>
                                                    <option value="NOT_EQUALS">NOT EQUALS</option>
                                                    <option value="CONTAINS">CONTAINS</option>
                                                    <option value="NOT_CONTAINS">NOT CONTAINS</option>
                                                    <option value="STARTS_WITH">STARTS WITH</option>
                                                    <option value="ENDS_WITH">ENDS WITH</option>
                                                </select>
                                                <input
                                                    type="text"
                                                    value={condition.value}
                                                    onChange={(e) => handleConditionChange(setIndex, condIndex, 'value', e.target.value)}
                                                    className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Value"
                                                />
                                                <button
                                                    onClick={() => handleRemoveCondition(setIndex, condIndex)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        ))
                                    )}

                                    <button
                                        onClick={() => handleAddCondition(setIndex)}
                                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                                    >
                                        <i className="fas fa-plus mr-2"></i>Add Condition
                                    </button>
                                </div>

                                {/* Per-condition set output format selector */}
                                <div className="mb-4 bg-white p-3 rounded border">
                                    <h4 className="text-md font-medium mb-2">Result Format</h4>
                                    <div className="flex space-x-4">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                name={`outputFormat_${setIndex}`}
                                                value="VALUE"
                                                checked={conditionSet.outputFormat === 'VALUE'}
                                                onChange={() => handleOutputFormatChange(setIndex, 'VALUE')}
                                                className="mr-2"
                                            />
                                            <span className="text-gray-700">Use value tag</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                name={`outputFormat_${setIndex}`}
                                                value="SOURCE"
                                                checked={conditionSet.outputFormat === 'SOURCE'}
                                                onChange={() => handleOutputFormatChange(setIndex, 'SOURCE')}
                                                className="mr-2"
                                            />
                                            <span className="text-gray-700">Use source tag</span>
                                        </label>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-md font-medium mb-2">Result Value</h4>
                                    <input
                                        type="text"
                                        value={conditionSet.value}
                                        onChange={(e) => handleResultValueChange(setIndex, e.target.value)}
                                        className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 ${
                                            conditionSet.outputFormat === 'SOURCE' ? 'bg-gray-100' : ''
                                        }`}
                                        placeholder="Enter result value"
                                        disabled={conditionSet.outputFormat === 'SOURCE' && conditionSet.conditions.length > 0}
                                    />
                                    {conditionSet.outputFormat === 'SOURCE' && conditionSet.conditions.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            In source mode, result value will be the same as the source field.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button
                            onClick={handleAddConditionSet}
                            className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <i className="fas fa-plus mr-2"></i>Add Condition Set
                        </button>
                    </div>
                )}

                <div className="flex justify-end gap-4 mt-6">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

// Make component available globally
window.MappingTableDialog = MappingTableDialog;