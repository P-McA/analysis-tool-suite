const OrderPreferenceModal = ({ isOpen, onClose, onSave }) => {
    const [preference, setPreference] = React.useState('original');

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(preference);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Field Order Preference</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-gray-600 mb-3">
                        How would you like to order the fields in the saved file?
                    </p>

                    <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="orderPreference"
                                value="original"
                                checked={preference === 'original'}
                                onChange={() => setPreference('original')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span className="text-gray-900">Preserve current order</span>
                        </label>

                        <label className="flex items-center space-x-2">
                            <input
                                type="radio"
                                name="orderPreference"
                                value="alphabetical"
                                checked={preference === 'alphabetical'}
                                onChange={() => setPreference('alphabetical')}
                                className="h-4 w-4 text-blue-600"
                            />
                            <span className="text-gray-900">Sort fields alphabetically</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

// Make component available globally
window.OrderPreferenceModal = OrderPreferenceModal;