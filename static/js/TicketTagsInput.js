// TicketTagsInput.js
const TicketTagsInput = ({ tickets, onChange, index }) => {
    const [inputValue, setInputValue] = React.useState('');
    const inputRef = React.useRef(null);

    // Parse tickets string into array of individual tickets
    const ticketArray = React.useMemo(() => {
        if (!tickets) return [];
        return tickets.split('\n').filter(ticket => ticket.trim() !== '');
    }, [tickets]);

    const handleInputChange = (e) => {
        setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e) => {
        // If Enter or comma is pressed, add the ticket
        if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
            e.preventDefault();
            addTicket();
        }

        // If Backspace is pressed and input is empty, remove the last ticket
        if (e.key === 'Backspace' && !inputValue && ticketArray.length > 0) {
            removeTicket(ticketArray.length - 1);
        }
    };

    const addTicket = () => {
        // Skip if the ticket is already in the list
        if (ticketArray.includes(inputValue.trim())) {
            setInputValue('');
            return;
        }

        const newTickets = [...ticketArray, inputValue.trim()].join('\n');
        onChange(index, 'tickets', newTickets);
        setInputValue('');
    };

    const removeTicket = (idx) => {
        const newTickets = ticketArray.filter((_, i) => i !== idx).join('\n');
        onChange(index, 'tickets', newTickets);
    };

    const focusInput = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div
            className="min-h-[38px] p-1 border rounded focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 cursor-text"
            onClick={focusInput}
        >
            <div className="flex flex-wrap gap-1 items-center">
                {ticketArray.map((ticket, idx) => (
                    <div
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-sm"
                    >
                        <span>{ticket}</span>
                        <button
                            type="button"
                            className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTicket(idx);
                            }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleInputKeyDown}
                    onBlur={() => {
                        if (inputValue.trim()) {
                            addTicket();
                        }
                    }}
                    className="flex-grow py-1 px-2 bg-transparent outline-none text-sm min-w-[80px]"
                    placeholder={ticketArray.length === 0 ? "Enter ticket IDs..." : ""}
                />
            </div>
        </div>
    );
};

// Make component available globally
window.TicketTagsInput = TicketTagsInput;