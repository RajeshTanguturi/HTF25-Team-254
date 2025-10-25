
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api';
import toast from 'react-hot-toast';
import { FaPlus, FaTrash, FaClipboardList, FaMagic } from 'react-icons/fa';
import BulkTestCaseModal from '../components/BulkTestCaseModal';
import { parseInputToTypes, generateStarterCode } from '../utils/codeGen';

const initialStarterCode = [
    { language: 'javascript', code: 'function solve(args) {\n  // Your logic here\n}' },
    { language: 'python', code: 'def solve(args):\n  # Your logic here\n  pass' },
    { language: 'java', code: 'class Solution {\n    // Your method here\n}' },
];

const newProblemTemplate = () => ({
    id: Date.now(),
    title: '',
    description: '',
    starterCode: initialStarterCode,
    testCases: [{ input: '', output: '' }],
});

const Dashboard = () => {
    const [duration, setDuration] = useState(30);
    const [roomId, setRoomId] = useState('');
    const [problems, setProblems] = useState([newProblemTemplate()]);
    const [modalState, setModalState] = useState({ isOpen: false, probIndex: null });
    const [isGenerating, setIsGenerating] = useState(false);
    const navigate = useNavigate();

    const [aiConfig, setAiConfig] = useState({
        mode: 'topic',
        topic: 'arrays',
        difficulty: 'Easy',
        name: '',
        description: '',
        count: 1,
    });

    const handleAiConfigChange = (field, value) => {
        setAiConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleAiGenerate = async () => {
        setIsGenerating(true);
        const toastId = toast.loading("Preparing to generate with AI...");
        
        let newProblems = [];
        try {
            for (let i = 0; i < aiConfig.count; i++) {
                toast.loading(`Generating question ${i + 1} of ${aiConfig.count}...`, { id: toastId });
                
                const promptConfig = { ...aiConfig };
                if (aiConfig.count > 1) {
                    promptConfig.topic += ` (generate a different problem than before, seed: ${Math.random()})`;
                }

                const { data } = await API.post('/ai/generate-question', { promptConfig });
                newProblems.push({
                    ...newProblemTemplate(),
                    title: data.title,
                    description: data.description,
                    testCases: data.testCases,
                });
            }

            setProblems(prevProblems => {
                const updatedProblems = [...prevProblems];
                if (updatedProblems.length === 1 && updatedProblems[0].title === '') {
                    return newProblems;
                }
                return [...updatedProblems, ...newProblems];
            });

            toast.success(`${aiConfig.count} question(s) generated successfully!`, { id: toastId });
            
            setTimeout(() => {
                setProblems(currentProblems => {
                    const problemsToUpdate = [...currentProblems];
                    const startIndex = (problems.length === 1 && problems[0].title === '') ? 0 : problems.length;
                    for (let i = 0; i < newProblems.length; i++) {
                        updateStarterCodeForProblem(startIndex + i, problemsToUpdate);
                    }
                    return problemsToUpdate;
                });
            }, 100);

        } catch (error) {
            toast.error(error.response?.data?.message || "AI generation failed.", { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    const updateStarterCodeForProblem = (probIndex, currentProblems = problems) => {
        const problem = currentProblems[probIndex];
        const firstTestCase = problem.testCases[0];
        if (!firstTestCase || !problem.title) return;
        const inputTypes = parseInputToTypes(firstTestCase.input);
        const outputType = parseInputToTypes(firstTestCase.output);
        if (inputTypes) {
            const updatedProblems = [...currentProblems];
            updatedProblems[probIndex].starterCode = generateStarterCode(
                inputTypes, outputType ? outputType[0] : null, problem.title
            );
            setProblems(updatedProblems);
        }
    };

    const handleProblemChange = (index, field, value) => {
        const newProblems = [...problems];
        newProblems[index][field] = value;
        setProblems(newProblems);
        if (field === 'title') {
             updateStarterCodeForProblem(index, newProblems);
        }
    };

    const handleTestCaseChange = (probIndex, caseIndex, field, value) => {
        const newProblems = [...problems];
        newProblems[probIndex].testCases[caseIndex][field] = value;
        setProblems(newProblems);
        if (caseIndex === 0) {
            updateStarterCodeForProblem(probIndex, newProblems);
        }
    };

    const addTestCase = (probIndex) => {
        const newProblems = [...problems];
        newProblems[probIndex].testCases.push({ input: '', output: '' });
        setProblems(newProblems);
    };

    const removeTestCase = (probIndex, caseIndex) => {
        const newProblems = [...problems];
        if (newProblems[probIndex].testCases.length <= 1) {
            toast.error("A problem must have at least one test case.");
            return;
        }
        newProblems[probIndex].testCases.splice(caseIndex, 1);
        setProblems(newProblems);
    };

    const handleBulkAddTestCases = (newCases) => {
        if (!modalState.isOpen || modalState.probIndex === null) return;
        const probIndex = modalState.probIndex;
        const newProblems = [...problems];
        if (newProblems[probIndex].testCases.length === 1 && newProblems[probIndex].testCases[0].input === '' && newProblems[probIndex].testCases[0].output === '') {
            newProblems[probIndex].testCases = newCases;
        } else {
            newProblems[probIndex].testCases.push(...newCases);
        }
        setProblems(newProblems);
        updateStarterCodeForProblem(probIndex, newProblems);
    };

    const addProblem = () => {
        setProblems([...problems, newProblemTemplate()]);
    };

    const removeProblem = (index) => {
        if (problems.length <= 1) {
            toast.error("A contest must have at least one problem.");
            return;
        }
        const newProblems = [...problems];
        newProblems.splice(index, 1);
        setProblems(newProblems);
    };

    const handleCreateContest = async (e) => {
        e.preventDefault();
        const toastId = toast.loading('Creating custom contest...');
        try {
            const problemsToSubmit = problems.map(({ id, ...rest }) => rest);
            const { data } = await API.post('/contest/create', { duration, questions: problemsToSubmit });
            toast.success(`Contest room created!`, { id: toastId });
            navigate(`/contest/${data.roomId}/lobby`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create contest', { id: toastId });
        }
    };

    const handleJoinContest = async (e) => {
        e.preventDefault();
        if (!roomId) { toast.error("Please enter a Room ID."); return; }
        const toastId = toast.loading('Joining contest...');
        try {
            await API.post('/contest/join', { roomId });
            toast.success(`Joined contest!`, { id: toastId });
            navigate(`/contest/${roomId}/lobby`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to join contest', { id: toastId });
        }
    };

    return (
        <>
            <BulkTestCaseModal
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false, probIndex: null })}
                onAddTestCases={handleBulkAddTestCases}
            />
            <div className="space-y-10 max-w-6xl mx-auto">
                <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
                    <div className="bg-indigo-900/30 p-6 rounded-lg border border-indigo-700 mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                            <FaMagic className="text-indigo-400" /> AI Question Generator
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Mode</label>
                                <select value={aiConfig.mode} onChange={(e) => handleAiConfigChange('mode', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                                    <option value="topic">By Topic</option>
                                    <option value="leetcode">Specific LeetCode Problem</option>
                                    <option value="description">Describe Problem</option>
                                </select>
                            </div>

                            {aiConfig.mode === 'topic' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Topic</label>
                                        <input type="text" value={aiConfig.topic} onChange={(e) => handleAiConfigChange('topic', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">Difficulty</label>
                                        <select value={aiConfig.difficulty} onChange={(e) => handleAiConfigChange('difficulty', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                                            <option>Easy</option>
                                            <option>Medium</option>
                                            <option>Hard</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            {aiConfig.mode === 'leetcode' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">LeetCode Name or Number</label>
                                    <input type="text" value={aiConfig.name} onChange={(e) => handleAiConfigChange('name', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
                                </div>
                            )}
                            
                            {aiConfig.mode === 'description' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                                    <input type="text" value={aiConfig.description} onChange={(e) => handleAiConfigChange('description', e.target.value)} className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Number to Generate</label>
                                <input type="number" value={aiConfig.count} onChange={(e) => handleAiConfigChange('count', Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))} min="1" max="5" className="w-full md:w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white" />
                            </div>
                            <button
                                type="button"
                                onClick={handleAiGenerate}
                                disabled={isGenerating}
                                className="flex-grow py-2 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-md transition duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? 'Generating...' : `Generate & Add to Contest`}
                            </button>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-6">Manual Contest Editor</h2>
                    <form onSubmit={handleCreateContest} className="space-y-8">
                        <div>
                            <label className="block text-gray-300 mb-2 font-semibold">Contest Duration (minutes)</label>
                            <input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                min="10"
                                max="180"
                                required
                                className="w-full md:w-1/3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                            />
                        </div>

                        <div className="space-y-6">
                            {problems.map((problem, probIndex) => (
                                <div key={problem.id} className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xl font-bold text-teal-400">Problem #{probIndex + 1}</h3>
                                        {problems.length > 1 && (
                                            <button type="button" onClick={() => removeProblem(probIndex)} className="text-red-500 hover:text-red-400"><FaTrash /></button>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <input
                                            type="text"
                                            placeholder="Problem Title"
                                            value={problem.title}
                                            onChange={(e) => handleProblemChange(probIndex, 'title', e.target.value)}
                                            required
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                                        />
                                        <textarea
                                            placeholder="Problem Description"
                                            value={problem.description}
                                            onChange={(e) => handleProblemChange(probIndex, 'description', e.target.value)}
                                            required
                                            rows="4"
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                                        ></textarea>
                                        <div className="flex justify-between items-center pt-2">
                                            <h4 className="font-semibold text-gray-300">Test Cases</h4>
                                            <button
                                                type="button"
                                                onClick={() => setModalState({ isOpen: true, probIndex })}
                                                className="text-sm bg-teal-600 hover:bg-teal-700 text-white font-semibold py-1 px-3 rounded-md flex items-center gap-2"
                                            >
                                                <FaClipboardList /> Bulk Add
                                            </button>
                                        </div>
                                        {problem.testCases.map((tc, caseIndex) => (
                                            <div key={caseIndex} className="flex gap-4 items-center">
                                                <textarea
                                                    placeholder="Input(s), comma-separated"
                                                    value={tc.input}
                                                    onChange={(e) => handleTestCaseChange(probIndex, caseIndex, 'input', e.target.value)}
                                                    required
                                                    rows="1"
                                                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white font-mono text-sm"
                                                ></textarea>
                                                <textarea
                                                    placeholder="Expected Output"
                                                    value={tc.output}
                                                    onChange={(e) => handleTestCaseChange(probIndex, caseIndex, 'output', e.target.value)}
                                                    required
                                                    rows="1"
                                                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white font-mono text-sm"
                                                ></textarea>
                                                {problem.testCases.length > 1 && (
                                                    <button type="button" onClick={() => removeTestCase(probIndex, caseIndex)} className="text-red-500 hover:text-red-400"><FaTrash /></button>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => addTestCase(probIndex)}
                                            className="text-sm text-teal-400 hover:text-teal-300 flex items-center gap-2"
                                        >
                                            <FaPlus /> Add Single Test Case
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addProblem}
                                className="w-full mt-4 py-2 border-2 border-dashed border-gray-600 hover:bg-gray-700 text-gray-300 font-bold rounded-md transition duration-200 flex items-center justify-center gap-2"
                            >
                                <FaPlus /> Add Another Problem
                            </button>
                        </div>
                        <button
                            type="submit"
                            className="w-full mt-6 py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-md transition duration-200 text-lg"
                        >
                            Create Contest & Get Room Code
                        </button>
                    </form>
                </div>

                <div className="bg-gray-800 p-8 rounded-lg shadow-xl">
                    <h2 className="text-2xl font-bold text-white mb-4">Or Join an Existing Contest</h2>
                    <form onSubmit={handleJoinContest} className="flex gap-4">
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="Enter Room Code"
                            className="flex-grow px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            className="py-2 px-6 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-md transition duration-200"
                        >
                            Join Room
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default Dashboard;