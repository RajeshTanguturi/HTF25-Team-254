import { useState } from 'react';
import toast from 'react-hot-toast';

const BulkTestCaseModal = ({ isOpen, onClose, onAddTestCases }) => {
    const [inputsText, setInputsText] = useState('');
    const [outputsText, setOutputsText] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleAdd = () => {
        const inputs = inputsText.split('\n').filter(line => line.trim() !== '');
        const outputs = outputsText.split('\n').filter(line => line.trim() !== '');

        if (inputs.length === 0) {
            toast.error("Inputs cannot be empty.");
            return;
        }

        if (inputs.length !== outputs.length) {
            toast.error("The number of inputs must match the number of outputs.");
            return;
        }

        const newTestCases = inputs.map((input, index) => ({
            input: input.trim(),
            output: outputs[index].trim(),
        }));

        onAddTestCases(newTestCases);
        toast.success(`${newTestCases.length} test cases added!`);
        onClose(); // Close the modal after adding
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-4xl mx-4"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <h2 className="text-2xl font-bold text-teal-400 mb-4">Bulk Add Test Cases</h2>
                <p className="text-gray-400 mb-6">Paste your inputs and outputs below, with each test case on a new line. The number of lines must match.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-lg font-semibold text-gray-200 mb-2">Inputs</label>
                        <textarea
                            value={inputsText}
                            onChange={(e) => setInputsText(e.target.value)}
                            placeholder={'[1,2,3], "hello"\n121\n[4,5,6]'}
                            className="w-full h-64 p-3 bg-gray-900 border border-gray-600 rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                    <div>
                        <label className="block text-lg font-semibold text-gray-200 mb-2">Expected Outputs</label>
                        <textarea
                            value={outputsText}
                            onChange={(e) => setOutputsText(e.target.value)}
                            placeholder={'6\ntrue\n"world"'}
                            className="w-full h-64 p-3 bg-gray-900 border border-gray-600 rounded-md text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-8">
                    <button 
                        onClick={onClose}
                        className="py-2 px-6 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-md transition duration-200"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleAdd}
                        className="py-2 px-6 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-md transition duration-200"
                    >
                        Add Test Cases
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkTestCaseModal;