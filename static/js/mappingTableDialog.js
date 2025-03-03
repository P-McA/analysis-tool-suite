// Complete MappingTableDialog component with NVL/REF and multiple values support
const MappingTableDialog = ({ isOpen, onClose, mappingType, initialData, onSave }) => {
    const [mappedValues, setMappedValues] = React.useState({
        src: initialData?.src || '',
        mappings: initialData?.mappings || []
    });

    const [derivedMapping, setDerivedMapping] = React.useState({
        conditions: initialData?.conditions || [],
        value: initialData?.value || '',
        conditionSets: initialData?.conditionSets || [],
        specialTags: initialData?.specialTags || []
    });

    // Track which condition sets have special tag types
    const [specialTagTypes, setSpecialTagTypes] = React.useState({});

    // Track which conditions have their multiple values section open
    const [multipleValuesOpen, setMultipleValuesOpen] = React.useState({});

    React.useEffect(() => {
        // Initialize derived mapping with conditional sets if available
        if (mappingType === 'DERIVED' && initialData) {
            // Initialize special tag types based on initialData
            if (initialData.specialTags && initialData.specialTags.length > 0) {
                const newSpecialTagTypes = {};
                initialData.specialTags.forEach((tag, index) => {
                    newSpecialTagTypes[index] = tag.type; // NVL or REF
                });
                setSpecialTagTypes(newSpecialTagTypes);
            }

            if (initialData.conditionSets && initialData.conditionSets.length > 0) {
                // Ensure each condition set has its own outputFormat
                const enhancedConditionSets = initialData.conditionSets.map(set => {
                    // Detect output format for this specific set
                    let outputFormat = set.outputFormat || 'VALUE'; // Default to VALUE format

                    // Look for indicators that this set uses source format if the format isn't specified
                    if (!set.outputFormat && (
                        set.useSourceTag ||
                        (set.conditions.some(cond => cond.src === set.value)) ||
                        initialData.outputFormat === 'SOURCE')
                    ) {
                        outputFormat = 'SOURCE';
                    }

                    return {
                        ...set,
                        outputFormat,
                        specialTags: set.specialTags || []
                    };
                });

                setDerivedMapping({
                    ...derivedMapping,
                    conditionSets: enhancedConditionSets,
                    specialTags: initialData.specialTags || [],
                    // Keep conditions for backward compatibility
                    conditions: initialData.conditions || []
                });
            } else if (initialData.conditions && initialData.conditions.length > 0) {
                // Convert old format to new format if needed
                const outputFormat = initialData.outputFormat || 'VALUE'; // Default to VALUE
                const defaultSet = {
                    conditions: initialData.conditions || [],
                    value: initialData.value || '',
                    outputFormat,
                    specialTags: initialData.specialTags || []
                };
                setDerivedMapping({
                    conditions: initialData.conditions || [],
                    value: initialData.value || '',
                    conditionSets: [defaultSet],
                    specialTags: initialData.specialTags || []
                });
            } else {
                // Initialize with empty condition set if nothing exists
                setDerivedMapping({
                    conditions: [],
                    value: initialData.value || '',
                    conditionSets: [{
                        conditions: [],
                        value: initialData.value || '',
                        outputFormat: 'VALUE', // Default to VALUE format
                        specialTags: []
                    }],
                    specialTags: initialData.specialTags || []
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

    // Handle adding a special tag (NVL/REF) to a condition set
    const handleAddSpecialTag = (setIndex, tagType) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        if (!newConditionSets[setIndex].specialTags) {
            newConditionSets[setIndex].specialTags = [];
        }

        if (tagType === 'NVL') {
            newConditionSets[setIndex].specialTags.push({
                type: 'NVL',
                sources: [''] // Initialize with one empty source
            });
        } else if (tagType === 'REF') {
            newConditionSets[setIndex].specialTags.push({
                type: 'REF',
                value: ''
            });
        }

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });

        // Update the special tag types tracking
        setSpecialTagTypes({
            ...specialTagTypes,
            [setIndex]: tagType
        });
    };

    // Handle removing a special tag from a condition set
    const handleRemoveSpecialTag = (setIndex, tagIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        if (newConditionSets[setIndex].specialTags) {
            newConditionSets[setIndex].specialTags = newConditionSets[setIndex].specialTags.filter((_, i) => i !== tagIndex);
        }

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });

        // Update the special tag types tracking if no tags left
        if (newConditionSets[setIndex].specialTags.length === 0) {
            const newTypes = {...specialTagTypes};
            delete newTypes[setIndex];
            setSpecialTagTypes(newTypes);
        }
    };

    // Handle updating NVL source values
    const handleNvlSourceChange = (setIndex, tagIndex, sourceIndex, value) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        if (newConditionSets[setIndex].specialTags &&
            newConditionSets[setIndex].specialTags[tagIndex] &&
            newConditionSets[setIndex].specialTags[tagIndex].sources) {

            newConditionSets[setIndex].specialTags[tagIndex].sources[sourceIndex] = value;
        }

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });
    };

    // Handle adding a new source to an NVL tag
    const handleAddNvlSource = (setIndex, tagIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        if (newConditionSets[setIndex].specialTags &&
            newConditionSets[setIndex].specialTags[tagIndex] &&
            newConditionSets[setIndex].specialTags[tagIndex].sources) {

            newConditionSets[setIndex].specialTags[tagIndex].sources.push('');
        }

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });
    };

    // Handle removing a source from an NVL tag
    const handleRemoveNvlSource = (setIndex, tagIndex, sourceIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        if (newConditionSets[setIndex].specialTags &&
            newConditionSets[setIndex].specialTags[tagIndex] &&
            newConditionSets[setIndex].specialTags[tagIndex].sources) {

            // Don't remove if it's the last source
            if (newConditionSets[setIndex].specialTags[tagIndex].sources.length > 1) {
                newConditionSets[setIndex].specialTags[tagIndex].sources =
                    newConditionSets[setIndex].specialTags[tagIndex].sources.filter((_, i) => i !== sourceIndex);
            }
        }

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });
    };

    // Handle updating REF value
    const handleRefValueChange = (setIndex, tagIndex, value) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        if (newConditionSets[setIndex].specialTags &&
            newConditionSets[setIndex].specialTags[tagIndex]) {

            newConditionSets[setIndex].specialTags[tagIndex].value = value;
        }

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });
    };

    // Handle changing an additional value
    const handleAdditionalValueChange = (setIndex, condIndex, valueIndex, newValue) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        // Ensure additionalValues array exists
        if (!newConditionSets[setIndex].conditions[condIndex].additionalValues) {
            newConditionSets[setIndex].conditions[condIndex].additionalValues = [];
        }

        // Update the value
        newConditionSets[setIndex].conditions[condIndex].additionalValues[valueIndex] = newValue;

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });
    };

    // Handle adding a new additional value
    const handleAddAdditionalValue = (setIndex, condIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        // Ensure additionalValues array exists
        if (!newConditionSets[setIndex].conditions[condIndex].additionalValues) {
            newConditionSets[setIndex].conditions[condIndex].additionalValues = [];
        }

        // Add a new empty value
        newConditionSets[setIndex].conditions[condIndex].additionalValues.push('');

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });
    };

    // Handle removing an additional value
    const handleRemoveAdditionalValue = (setIndex, condIndex, valueIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        // Remove the value
        newConditionSets[setIndex].conditions[condIndex].additionalValues.splice(valueIndex, 1);

        setDerivedMapping({
            ...derivedMapping,
            conditionSets: newConditionSets
        });
    };

    // Handle mapped values functions...
    const handleAddMapping = () => {
        setMappedValues({
            ...mappedValues,
            mappings: [...mappedValues.mappings, { from: '', to: '' }]
        });
    };

    const handleMappingChange = (index, field, value) => {
        const newMappings = [...mappedValues.mappings];
        newMappings[index] = { ...newMappings[index], [field]: value };
        setMappedValues({ ...mappedValues, mappings: newMappings });
    };

    const handleRemoveMapping = (index) => {
        const newMappings = mappedValues.mappings.filter((_, i) => i !== index);
        setMappedValues({ ...mappedValues, mappings: newMappings });
    };

    const handleSourceChange = (e) => {
        setMappedValues({ ...mappedValues, src: e.target.value });
    };

    // Handle derived mapping functions...
    const handleAddCondition = (setIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];
        newConditionSets[setIndex].conditions = [
            ...newConditionSets[setIndex].conditions,
            { src: '', oper: 'EQUALS', value: '', additionalValues: [] }
        ];
        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    const handleConditionChange = (setIndex, condIndex, field, value) => {
        const newConditionSets = [...derivedMapping.conditionSets];

        // Create a copy of the condition to avoid mutating the original
        const updatedCondition = {
            ...newConditionSets[setIndex].conditions[condIndex]
        };

        // Update the specified field
        updatedCondition[field] = value;

        // Make sure we preserve additionalValues when updating other fields
        if (!updatedCondition.additionalValues &&
            newConditionSets[setIndex].conditions[condIndex].additionalValues) {
            updatedCondition.additionalValues =
                [...newConditionSets[setIndex].conditions[condIndex].additionalValues];
        }

        // Update the condition in the set
        newConditionSets[setIndex].conditions[condIndex] = updatedCondition;

        // If in SOURCE mode and changing src field, also update result value to match
        if (newConditionSets[setIndex].outputFormat === 'SOURCE' && field === 'src') {
            newConditionSets[setIndex].value = value;
        }

        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    const handleRemoveCondition = (setIndex, condIndex) => {
        const newConditionSets = [...derivedMapping.conditionSets];
        newConditionSets[setIndex].conditions = newConditionSets[setIndex].conditions.filter((_, i) => i !== condIndex);
        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    const handleResultValueChange = (setIndex, value) => {
        const newConditionSets = [...derivedMapping.conditionSets];
        newConditionSets[setIndex].value = value;
        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });
    };

    const handleAddConditionSet = () => {
        setDerivedMapping({
            ...derivedMapping,
            conditionSets: [
                ...derivedMapping.conditionSets,
                {
                    conditions: [],
                    value: '',
                    outputFormat: 'VALUE', // Default to VALUE for new sets
                    specialTags: []
                }
            ]
        });
    };

    const handleRemoveConditionSet = (setIndex) => {
        if (derivedMapping.conditionSets.length <= 1) {
            return; // Don't remove the last set
        }

        const newConditionSets = derivedMapping.conditionSets.filter((_, i) => i !== setIndex);
        setDerivedMapping({ ...derivedMapping, conditionSets: newConditionSets });

        // Update specialTagTypes by removing the deleted set
        const newTagTypes = {...specialTagTypes};
        delete newTagTypes[setIndex];

        // Reindex the keys that are greater than setIndex
        Object.keys(newTagTypes).forEach(key => {
            const numKey = parseInt(key);
            if (numKey > setIndex) {
                newTagTypes[numKey - 1] = newTagTypes[numKey];
                delete newTagTypes[numKey];
            }
        });

        setSpecialTagTypes(newTagTypes);
    };

    // Handle saving the dialog
    const handleSave = () => {
        if (mappingType === 'MAPPED') {
            onSave(mappedValues);
        } else if (mappingType === 'DERIVED') {
            // Extract specialTags from condition sets for backward compatibility
            const allSpecialTags = [];
            derivedMapping.conditionSets.forEach(set => {
                if (set.specialTags && set.specialTags.length > 0) {
                    allSpecialTags.push(...set.specialTags);
                }
            });

            // For backward compatibility, we'll keep the old format
            // but use the new enhanced format for processing
            const enhancedDerivedMapping = {
                ...derivedMapping,
                // Update the main value and conditions from the first set for backward compatibility
                conditions: derivedMapping.conditionSets[0]?.conditions || [],
                value: derivedMapping.conditionSets[0]?.value || '',
                specialTags: allSpecialTags
            };
            onSave(enhancedDerivedMapping);
        }
        onClose();
    };

    // If the dialog is not open, don't render anything
    if (!isOpen) return null;

    // Render special tag selector and editor
    const renderSpecialTagEditor = (setIndex) => {
        const conditionSet = derivedMapping.conditionSets[setIndex];
        const specialTags = conditionSet.specialTags || [];

        return (
            <div className="mb-4 bg-white p-3 rounded border">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-medium">Special Tags (NVL/REF)</h4>
                    <div className="flex items-center">
                        <select
                            className="mr-2 p-2 border rounded"
                            onChange={(e) => handleAddSpecialTag(setIndex, e.target.value)}
                            value=""
                        >
                            <option value="" disabled>Add tag type...</option>
                            <option value="NVL">NVL</option>
                            <option value="REF">REF</option>
                        </select>
                    </div>
                </div>

                {/* Render existing special tags */}
                {specialTags.length > 0 ? (
                    <div className="space-y-3">
                        {specialTags.map((tag, tagIndex) => (
                            <div key={tagIndex} className="p-2 bg-gray-50 rounded border">
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-sm font-medium">{tag.type} Tag</h5>
                                    <button
                                        onClick={() => handleRemoveSpecialTag(setIndex, tagIndex)}
                                        className="text-red-600 hover:text-red-800"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                {tag.type === 'NVL' ? (
                                    <div className="space-y-2">
                                        {tag.sources.map((source, sourceIndex) => (
                                            <div key={sourceIndex} className="flex items-center">
                                                <input
                                                    type="text"
                                                    value={source}
                                                    onChange={(e) => handleNvlSourceChange(setIndex, tagIndex, sourceIndex, e.target.value)}
                                                    className="flex-grow p-2 border rounded mr-2"
                                                    placeholder="Source field"
                                                />
                                                {tag.sources.length > 1 && (
                                                    <button
                                                        onClick={() => handleRemoveNvlSource(setIndex, tagIndex, sourceIndex)}
                                                        className="text-red-600 hover:text-red-800 mr-2"
                                                    >
                                                        <i className="fas fa-minus"></i>
                                                    </button>
                                                )}
                                                {sourceIndex === tag.sources.length - 1 && (
                                                    <button
                                                        onClick={() => handleAddNvlSource(setIndex, tagIndex)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <i className="fas fa-plus"></i>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : tag.type === 'REF' ? (
                                    <div>
                                        <input
                                            type="text"
                                            value={tag.value || ''}
                                            onChange={(e) => handleRefValueChange(setIndex, tagIndex, e.target.value)}
                                            className="w-full p-2 border rounded"
                                            placeholder="Reference value"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 italic">No special tags added yet.</p>
                )}
            </div>
        );
    };

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

                                {/* Special Tags (NVL/REF) Editor */}
                                {renderSpecialTagEditor(setIndex)}

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
                                                    <option value="MATCHES">MATCHES</option>
                                                </select>

                                                <div className="flex flex-col flex-1">
                                                    <div className="flex">
                                                        <input
                                                            type="text"
                                                            value={condition.value}
                                                            onChange={(e) => handleConditionChange(setIndex, condIndex, 'value', e.target.value)}
                                                            className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                            placeholder="Value"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const key = `${setIndex}-${condIndex}`;
                                                                setMultipleValuesOpen({
                                                                    ...multipleValuesOpen,
                                                                    [key]: !multipleValuesOpen[key]
                                                                });
                                                            }}
                                                            className="ml-2 p-2 bg-gray-100 rounded hover:bg-gray-200 text-gray-600"
                                                            title="Multiple values"
                                                        >
                                                            <i className={`fas fa-${multipleValuesOpen[`${setIndex}-${condIndex}`] ? 'minus' : 'plus'}-circle`}></i>
                                                        </button>
                                                    </div>

                                                    {multipleValuesOpen[`${setIndex}-${condIndex}`] && (
                                                        <div className="mt-2 ml-4 border-l-2 border-blue-300 pl-2">
                                                            <div className="text-sm text-gray-600 mb-1">Additional Values:</div>

                                                            {condition.additionalValues && condition.additionalValues.map((value, valueIndex) => (
                                                                <div key={valueIndex} className="flex items-center mb-1">
                                                                    <input
                                                                        type="text"
                                                                        value={value}
                                                                        onChange={(e) => handleAdditionalValueChange(setIndex, condIndex, valueIndex, e.target.value)}
                                                                        className="flex-1 p-2 border rounded focus:ring-2 focus:ring-blue-500"
                                                                        placeholder={`Value ${valueIndex + 2}`}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveAdditionalValue(setIndex, condIndex, valueIndex)}
                                                                        className="ml-1 text-red-500 hover:text-red-700"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                </div>
                                                            ))}

                                                            <button
                                                                type="button"
                                                                onClick={() => handleAddAdditionalValue(setIndex, condIndex)}
                                                                className="mt-1 px-2 py-1 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                                            >
                                                                <i className="fas fa-plus mr-1"></i>
                                                                Add Value
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

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
                                            <span className="text-gray-700">Use value tag (preferred)</span>
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