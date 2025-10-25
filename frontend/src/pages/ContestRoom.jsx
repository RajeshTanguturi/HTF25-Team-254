

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import API from '../api';
import useAuth from '../hooks/useAuth';
import CodeEditor from '../components/CodeEditor';
import Leaderboard from '../components/Leaderboard';
import CountdownTimer from '../components/CountdownTimer';
import ChatBox from '../components/ChatBox';
import { FaPlay, FaPaperPlane, FaChevronLeft, FaChevronRight, FaClock, FaUsers, FaComments, FaTrophy, FaRedo } from 'react-icons/fa';

/**
 * A simple but effective markdown-like parser for problem descriptions.
 * Handles code blocks, inline code, and bold text.
 */
const parseDescription = (desc) => {
    if (!desc) return '';

    const codeBlocks = [];
    // 1. Extract and format multi-line code blocks
    let processedText = desc.replace(/```([\s\S]*?)```/g, (match, code) => {
        const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const formattedBlock = `<pre class="bg-gray-900 p-3 rounded-md text-sm font-mono my-4 overflow-x-auto">${escapedCode.trim()}</pre>`;
        codeBlocks.push(formattedBlock);
        return `__CODEBLOCK_${codeBlocks.length - 1}__`;
    });

    // 2. Process inline elements like bold and inline code
    processedText = processedText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code class="bg-gray-700 text-sm rounded px-1 py-0.5 font-mono">$1</code>');

    // 3. Handle newlines for paragraphs, treating consecutive newlines as a single break
    processedText = processedText
        .split('\n')
        .map(line => line.trim() === '' ? '<br/>' : line)
        .join('\n')
        .replace(/(\<br\/\>){2,}/g, '<br/>') // Collapse multiple breaks
        .replace(/\n/g, '<br/>');

    // 4. Restore the formatted code blocks
    processedText = processedText.replace(/__CODEBLOCK_(\d+)__/g, (match, index) => {
        return codeBlocks[parseInt(index, 10)];
    });

    return processedText;
};


const ContestRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [contest, setContest] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [language, setLanguage] = useState('java');
    const [problemSolutions, setProblemSolutions] = useState({});

    // --- State for LeetCode-style Console ---
    const [consoleTab, setConsoleTab] = useState('testcases'); // 'testcases' or 'result'
    const [activeTestCaseIndex, setActiveTestCaseIndex] = useState(0);
    const [editableInput, setEditableInput] = useState('');
    const [isInputModified, setIsInputModified] = useState(false);
    const [runResult, setRunResult] = useState(null); // Will hold structured result object

    const [leaderboard, setLeaderboard] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rightPanelTab, setRightPanelTab] = useState('leaderboard');
    const [messages, setMessages] = useState([]);
    const [unreadMessages, setUnreadMessages] = useState(0);

    // Resizable panels
    const [leftPanelWidth, setLeftPanelWidth] = useState(50);
    const [consoleHeight, setConsoleHeight] = useState(250);
    const [isResizingHorizontal, setIsResizingHorizontal] = useState(false);
    const [isResizingVertical, setIsResizingVertical] = useState(false);

    const socket = useRef(null);
    const editorWrapperRef = useRef(null);
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    // Contest end detection + overlay/confetti
    const [ended, setEnded] = useState(false);
    const [showFinalOverlay, setShowFinalOverlay] = useState(false);
    const [confettiPieces, setConfettiPieces] = useState([]);

    // Prevent page-level scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    // Fetch contest data
    useEffect(() => {
        const fetchContestData = async () => {
            try {
                const { data } = await API.get(`/contest/${roomId}/questions`);
                setContest(data);
                setQuestions(data.questions || []);
                if (data.questions && data.questions.length > 0) {
                    const initialSolutions = {};
                    data.questions.forEach(q => {
                        const initialCodeState = { javascript: '', python: '', java: '' };
                        (q.starterCode || []).forEach(sc => {
                            if (initialCodeState.hasOwnProperty(sc.language)) {
                                initialCodeState[sc.language] = sc.code;
                            }
                        });
                        initialSolutions[q._id] = initialCodeState;
                    });
                    setProblemSolutions(initialSolutions);
                }
                const leaderboardRes = await API.get(`/contest/${roomId}/leaderboard`);
                setLeaderboard(leaderboardRes.data || []);
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to load contest.");
                navigate("/dashboard");
            }
        };
        fetchContestData();
    }, [roomId, navigate]);

    // This effect ensures the input field is populated with the first
    // sample test case by default when a question loads.
    useEffect(() => {
        const currentProblem = questions[currentQuestionIndex];
        if (!currentProblem || !currentProblem.sampleTestCases) return;
        
        const currentTestCase = currentProblem.sampleTestCases[activeTestCaseIndex];
        if (currentTestCase) {
            setEditableInput(currentTestCase.input);
        } else if (currentProblem.sampleTestCases.length > 0) {
            // Fallback to the first test case if the index is somehow invalid
            setActiveTestCaseIndex(0);
            setEditableInput(currentProblem.sampleTestCases[0].input);
        } else {
            // Handle cases where a problem has no sample test cases
            setEditableInput('');
        }
        setConsoleTab('testcases');
        setRunResult(null);
    }, [currentQuestionIndex, questions, activeTestCaseIndex]);
    
    // Check if user has modified the sample input
    useEffect(() => {
        const originalInput = questions[currentQuestionIndex]?.sampleTestCases?.[activeTestCaseIndex]?.input;
        if (originalInput !== undefined) {
            setIsInputModified(editableInput !== originalInput);
        }
    }, [editableInput, activeTestCaseIndex, currentQuestionIndex, questions]);


    // Socket.IO setup
    useEffect(() => {
        socket.current = io(SOCKET_URL);
        socket.current.emit('joinRoom', roomId);
        const handleLeaderboardUpdate = (newLeaderboard) => setLeaderboard(newLeaderboard);
        const handleNewMessage = (newMessage) => {
            setMessages(prev => [...prev, newMessage]);
            if (newMessage.user && newMessage.user.id !== (user.id || user._id)) {
                setUnreadMessages(prev => prev + 1);
            }
        };
        socket.current.on('leaderboard:update', handleLeaderboardUpdate);
        socket.current.on('chat:message', handleNewMessage);
        return () => { if (socket.current) socket.current.disconnect(); };
    }, [roomId, SOCKET_URL, user.id, user._id]);

    // Resizing handlers
    const handleHorizontalResize = (e) => {
        if (!isResizingHorizontal) return;
        const newWidth = (e.clientX / window.innerWidth) * 100;
        if (newWidth >= 20 && newWidth <= 80) setLeftPanelWidth(newWidth);
    };
    const handleVerticalResize = (e) => {
        if (!isResizingVertical) return;
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight >= 150 && newHeight <= window.innerHeight * 0.7) setConsoleHeight(newHeight);
    };
    const stopResizing = () => {
        setIsResizingHorizontal(false);
        setIsResizingVertical(false);
    };
    useEffect(() => {
        if (isResizingHorizontal) {
            window.addEventListener('mousemove', handleHorizontalResize);
            window.addEventListener('mouseup', stopResizing);
        }
        if (isResizingVertical) {
            window.addEventListener('mousemove', handleVerticalResize);
            window.addEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', handleHorizontalResize);
            window.removeEventListener('mousemove', handleVerticalResize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizingHorizontal, isResizingVertical]);

    // Code change handler
    const handleCodeChange = (newCode) => {
        const currentProblemId = questions[currentQuestionIndex]?._id;
        if (!currentProblemId) return;
        setProblemSolutions(prev => ({
            ...prev,
            [currentProblemId]: { ...prev[currentProblemId], [language]: newCode }
        }));
    };

    // Run / Submit Logic
    const handleRunSubmit = async (type) => {
        const currentProblem = questions[currentQuestionIndex];
        if (!currentProblem) return;
        const currentCode = problemSolutions[currentProblem._id]?.[language] || '';
        const setLoading = type === 'run' ? setIsRunning : setIsSubmitting;

        setLoading(true);
        setRunResult(null);
        setConsoleTab('result');
        const toastId = type === 'submit' ? toast.loading("Submitting your solution...") : null;

        // This logic ensures that if the input box is empty, the first
        // sample case is used as a fallback for the "Run" action.
        let inputForRun = '';
        if (type === 'run') {
            if (editableInput.trim() === '') {
                const firstSampleInput = currentProblem.sampleTestCases?.[0]?.input;
                if (firstSampleInput) {
                    toast.success("Empty input: Using Case 1 as default.");
                    inputForRun = firstSampleInput;
                }
            } else {
                inputForRun = editableInput;
            }
        }

        try {
            const { data } = await API.post(`/code/${type}`, {
                language,
                code: currentCode,
                problemId: currentProblem._id,
                contestId: contest._id,
                input: type === 'run' ? inputForRun : undefined,
            });

            if (toastId) toast.dismiss(toastId);

            if (type === 'run') {
                if (data.type === 'error') {
                    setRunResult({ status: 'error', message: data.message, input: inputForRun });
                } else {
                    let displayOutput = data.output;
                    try {
                        displayOutput = JSON.stringify(JSON.parse(displayOutput), null, 2);
                    } catch {}
                    setRunResult({
                        status: 'ran',
                        input: inputForRun,
                        actual: displayOutput,
                    });
                }
            } else { // Submit
                if(data.error){
                    setRunResult({ status: 'error', message: data.error });
                } else {
                    const { success, testCasesPassed, totalTestCases, score } = data;
                    if (success) toast.success(`All ${totalTestCases} test cases passed!`);
                    else toast.error(`Passed ${testCasesPassed}/${totalTestCases} test cases.`);
                    setRunResult({
                        status: 'submitted',
                        message: `Result: ${success ? 'Accepted' : 'Partial/Wrong Answer'}\nScore: ${score}\nPassed: ${testCasesPassed} / ${totalTestCases}`
                    });
                }
            }
        } catch (error) {
            if (toastId) toast.dismiss(toastId);
            const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
            toast.error(errorMessage);
            setRunResult({ status: 'error', message: errorMessage, input: inputForRun });
        } finally {
            setLoading(false);
        }
    };
    
    // Reset test case input to its default
    const handleResetInput = () => {
        const originalInput = questions[currentQuestionIndex]?.sampleTestCases?.[activeTestCaseIndex]?.input;
        if(originalInput !== undefined) setEditableInput(originalInput);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (!e.ctrlKey && !e.metaKey) {
                return;
            }
    
            if (e.key === "'") {
                e.preventDefault();
                if (!isRunning && !isSubmitting) {
                    handleRunSubmit('run');
                }
            }
    
            if (e.key === 'Enter') {
                e.preventDefault();
                if (!isRunning && !isSubmitting) {
                    handleRunSubmit('submit');
                }
            }
        };
    
        window.addEventListener('keydown', handleGlobalKeyDown, true);
    
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown, true);
        };
    
    }, [isRunning, isSubmitting, editableInput, language, problemSolutions, questions, currentQuestionIndex, contest]);


    // Contest end detection & confetti
    useEffect(() => {
        if (!contest?.endTime || ended) return;
        const checkEnd = () => {
            if (new Date(contest.endTime).getTime() <= Date.now()) {
                setEnded(true);
                setShowFinalOverlay(true);
                const colors = ['#ff4d4f', '#ffa940', '#ffd666', '#73d13d', '#36cfc9', '#40a9ff', '#9254de'];
                setConfettiPieces(Array.from({ length: 40 }).map((_, i) => ({
                    id: i, left: Math.random() * 100, delay: `${(Math.random() * 2).toFixed(2)}s`,
                    duration: `${(5 + Math.random() * 5).toFixed(2)}s`, size: 8 + Math.round(Math.random() * 10),
                    color: colors[i % colors.length], rotate: Math.round(Math.random() * 360)
                })));
                setTimeout(() => setConfettiPieces([]), 10000);
            }
        };
        const timer = setInterval(checkEnd, 1000);
        return () => clearInterval(timer);
    }, [contest, ended]);

    // --- RENDER LOGIC ---

    if (!contest || questions.length === 0) {
        return <div className="fixed inset-0 bg-gray-900 flex items-center justify-center text-white"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div></div>;
    }

    const currentProblem = questions[currentQuestionIndex];
    const codeForEditor = problemSolutions[currentProblem?._id]?.[language] || '';

    return (
        <div className="fixed inset-0 bg-gray-900 text-white flex flex-col font-sans" style={{ zIndex: 999 }}>
            {/* Confetti Styles */}
            <style>{`@keyframes f{0%{transform:translateY(-10vh) rotate(0deg)}100%{transform:translateY(110vh) rotate(720deg)}} .confetti{position:absolute;top:-10vh;will-change:transform;pointer-events:none;}`}</style>
            
            {/* Header */}
            <header className="bg-gray-800 border-b border-gray-700 px-4 h-14 flex items-center justify-between flex-shrink-0">
                 <div className="flex items-center gap-x-6">
                     <h1 className="text-xl font-bold text-blue-400">CodeIt</h1>
                     {contest.endTime && <div className="flex items-center gap-x-2 text-sm text-gray-300"><FaClock className="text-orange-400" /><CountdownTimer endTime={contest.endTime} /></div>}
                 </div>
                 <div className="flex items-center gap-x-4">
                     <div className="flex items-center gap-x-2 text-sm text-gray-300"><FaUsers /><span>{leaderboard.length}</span></div>
                     <div className="font-semibold text-white">{user.name}</div>
                     <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-md text-sm font-bold">Leave</button>
                 </div>
            </header>

            {/* Questions Nav */}
            <nav className="bg-gray-800 border-b border-gray-700 px-4 h-12 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-x-2 overflow-x-auto">
                    {questions.map((q, index) => (
                        <button key={q._id} onClick={() => setActiveTestCaseIndex(0) || setCurrentQuestionIndex(index)} className={`px-3 py-1 text-sm rounded-md transition-colors whitespace-nowrap ${index === currentQuestionIndex ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}>
                           {q.title}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-x-2 flex-shrink-0">
                    <button onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))} disabled={currentQuestionIndex === 0} className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-md"><FaChevronLeft size={12}/></button>
                    <button onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))} disabled={currentQuestionIndex === questions.length - 1} className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-md"><FaChevronRight size={12} /></button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 flex flex-row overflow-hidden">
                {/* Left: Problem Description */}
                <div style={{ width: `${leftPanelWidth}%` }} className="bg-gray-800 flex flex-col min-w-[300px]">
                     <div className="p-6 flex-1 overflow-auto">
                        <h2 className="text-2xl font-bold text-white mb-4">{currentQuestionIndex + 1}. {currentProblem.title}</h2>
                        <div className="text-gray-300/90 leading-relaxed space-y-4" dangerouslySetInnerHTML={{ __html: parseDescription(currentProblem.description) }} />
                        <div className="mt-6 space-y-5">
                            {currentProblem.sampleTestCases?.map((tc, index) => (
                                <div key={index}>
                                    <h3 className="text-base font-semibold mb-2">Example {index + 1}:</h3>
                                    <div className="bg-gray-900 rounded-lg p-3 text-sm font-mono space-y-1">
                                       <div><span className="text-gray-400">Input: </span>{tc.input}</div>
                                       <div><span className="text-gray-400">Output: </span>{tc.output}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Resizer */}
                <div onMouseDown={() => setIsResizingHorizontal(true)} className="w-1.5 bg-gray-700 cursor-col-resize hover:bg-blue-500 transition-colors flex-shrink-0"/>

                {/* Right: Editor + Console + Side Panel */}
                <div className="flex-1 flex flex-row overflow-hidden min-w-0">
                    <div className="flex-1 flex flex-col overflow-hidden min-w-[400px]">
                        {/* Editor Header */}
                        <header className="bg-gray-800 border-b border-gray-700 px-4 h-12 flex items-center justify-between flex-shrink-0">
                             <select value={language} onChange={(e) => setLanguage(e.target.value)} className="bg-gray-700 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                            </select>
                        </header>

                        {/* Editor */}
                        <div className="flex-1 bg-gray-900 overflow-hidden" ref={editorWrapperRef}>
                            <CodeEditor code={codeForEditor} setCode={handleCodeChange} language={language} />
                        </div>

                        {/* Resizer */}
                        <div onMouseDown={() => setIsResizingVertical(true)} className="h-1.5 bg-gray-800 cursor-row-resize hover:bg-blue-500 transition-colors flex-shrink-0"/>

                        {/* Console */}
                        <div style={{ height: `${consoleHeight}px` }} className="bg-gray-800 flex flex-col overflow-hidden flex-shrink-0">
                            {/* Console Header */}
                            <div className="flex items-center justify-between border-b border-gray-700 h-12 px-4 flex-shrink-0">
                                <div className="flex items-center gap-x-2">
                                    <button onClick={() => setConsoleTab('testcases')} className={`px-3 py-1 text-sm rounded-md ${consoleTab === 'testcases' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>Testcase</button>
                                    <button onClick={() => setConsoleTab('result')} className={`px-3 py-1 text-sm rounded-md ${consoleTab === 'result' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>Result</button>
                                </div>
                                <div className="flex items-center gap-x-2">
                                    <button onClick={() => handleRunSubmit('run')} disabled={isRunning || isSubmitting} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-md flex items-center gap-x-2 disabled:opacity-50 text-sm">
                                        <FaPlay /><span>{isRunning ? 'Running...' : 'Run'}</span>
                                    </button>
                                    <button onClick={() => handleRunSubmit('submit')} disabled={isRunning || isSubmitting} className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-md flex items-center gap-x-2 disabled:opacity-50 text-sm">
                                        <FaPaperPlane /><span>{isSubmitting ? 'Submitting...' : 'Submit'}</span>
                                    </button>
                                </div>
                            </div>
                            
                            {/* Console Content */}
                            <div className="flex-1 bg-gray-900 overflow-y-auto p-4">
                                {consoleTab === 'testcases' && (
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center gap-x-2 mb-2 flex-shrink-0">
                                            {currentProblem.sampleTestCases.map((_, index) => (
                                                <button key={index} onClick={() => setActiveTestCaseIndex(index)} className={`px-3 py-1 text-xs rounded-md ${activeTestCaseIndex === index ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}>Case {index + 1}</button>
                                            ))}
                                        </div>
                                        <div className="flex-1 flex flex-col gap-y-2 console-input-area">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-semibold text-gray-400">Input</label>
                                                {isInputModified && <button onClick={handleResetInput} className="flex items-center gap-x-1.5 text-xs text-blue-400 hover:text-blue-300"><FaRedo size={10} /> Reset</button>}
                                            </div>
                                            <textarea value={editableInput} onChange={e => setEditableInput(e.target.value)} className="w-full flex-1 bg-gray-800 text-gray-200 font-mono text-sm p-2 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                        </div>
                                    </div>
                                )}

                                {consoleTab === 'result' && runResult && (
                                    <div className="font-mono text-sm">
                                        {runResult.status === 'ran' && <h3 className="text-2xl font-semibold text-cyan-400">Finished Running</h3>}
                                        {runResult.status === 'accepted' && <h3 className="text-2xl font-semibold text-green-400">Accepted</h3>}
                                        {runResult.status === 'wrong' && <h3 className="text-2xl font-semibold text-red-400">Wrong Answer</h3>}
                                        {runResult.status === 'error' && <h3 className="text-2xl font-semibold text-red-500">Execution Error</h3>}
                                        {runResult.status === 'submitted' && <h3 className="text-2xl font-semibold text-blue-400">Submission Result</h3>}

                                        <div className="mt-4 space-y-3">
                                            {runResult.input && <div><div className="text-gray-400 text-xs uppercase font-semibold">Input Used</div><pre className="bg-gray-800 p-2 rounded mt-1">{runResult.input}</pre></div>}
                                            {runResult.expected && <div><div className="text-gray-400 text-xs uppercase font-semibold">Expected Output</div><pre className="bg-gray-800 p-2 rounded mt-1">{runResult.expected}</pre></div>}
                                            {runResult.actual && <div><div className="text-gray-400 text-xs uppercase font-semibold">Your Output</div><pre className="bg-gray-800 p-2 rounded mt-1">{runResult.actual}</pre></div>}
                                            {runResult.message && <pre className="whitespace-pre-wrap">{runResult.message}</pre>}
                                        </div>
                                    </div>
                                )}

                                {!runResult && consoleTab === 'result' && <div className="text-gray-400 text-sm">Run or submit code to see the result.</div>}
                            </div>
                        </div>
                    </div>

                    {/* Right Side Panel */}
                    <div className="w-80 flex flex-col bg-gray-800 border-l border-gray-700 flex-shrink-0">
                        <div className="flex border-b border-gray-700 flex-shrink-0 h-12">
                            <button onClick={() => setRightPanelTab('leaderboard')} className={`w-1/2 text-sm font-medium flex items-center justify-center gap-x-2 ${rightPanelTab === 'leaderboard' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-600'}`}><FaTrophy /> Leaderboard</button>
                            <button onClick={() => setRightPanelTab('chat')} className={`w-1/2 text-sm font-medium flex items-center justify-center gap-x-2 relative ${rightPanelTab === 'chat' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:bg-gray-600'}`}>
                                <FaComments /> Chat {unreadMessages > 0 && <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{unreadMessages}</span>}
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {rightPanelTab === 'leaderboard' && <Leaderboard leaderboard={leaderboard} contestStartTime={contest.startTime} />}
                            {rightPanelTab === 'chat' && <ChatBox socket={socket.current} user={user} roomId={roomId} messages={messages} setMessages={setMessages} />}
                        </div>
                    </div>
                </div>
            </main>
            
            {/* End of Contest Overlay */}
            {showFinalOverlay && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
                    {confettiPieces.map(p => <div key={p.id} className="confetti" style={{ left: `${p.left}%`, background: p.color, width: `${p.size}px`, height: `${p.size * 0.6}px`, animation: `f ${p.duration} linear ${p.delay} 1`}} />)}
                    <div className="relative bg-gray-800 rounded-lg p-8 w-[min(920px,92%)] shadow-2xl">
                         <h2 className="text-3xl font-bold text-center text-yellow-400 mb-4">Contest Finished!</h2>
                         <p className="text-center text-gray-300 mb-6">Here are the final standings. Well done to all participants!</p>
                         <div className="max-h-[60vh] overflow-auto"><Leaderboard leaderboard={leaderboard} contestStartTime={contest.startTime} finalView /></div>
                         <div className="mt-6 text-center">
                            <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold">Back to Dashboard</button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContestRoom;






