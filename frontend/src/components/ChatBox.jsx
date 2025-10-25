// import { useState, useEffect, useRef } from 'react';
// import { FaPaperPlane, FaInfoCircle, FaRegCopy } from 'react-icons/fa';
// import MessageSeen from './MessageSeen';

// const ChatBox = ({ socket, user, roomId, messages }) => {
//     const [currentMessage, setCurrentMessage] = useState('');
//     const messagesEndRef = useRef(null);

//     const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
//     useEffect(scrollToBottom, [messages]);

//     const handleSendMessage = (e) => {
//         e.preventDefault();
//         // allow multiline code: check trimmed content for emptiness but send original content (preserve formatting)
//         if ((currentMessage || '').toString().trim() && socket) {
//             socket.emit('chat:message', { roomId, message: currentMessage, user: { name: user.name, id: user.id || user._id } });
//             setCurrentMessage('');
//         }
//     };

//     const copyToClipboard = async (text) => {
//         try {
//             await navigator.clipboard.writeText(text);
//             // small visual feedback could be added here (toast), but keep simple
//         } catch (err) {
//             console.error('Copy failed', err);
//         }
//     };

//     return (
//         <div className="bg-dark-charcoal p-4 rounded-lg h-full flex flex-col">
//             <h2 className="text-lg font-bold mb-4 text-white">Room Chat</h2>
//             <div className="flex-grow overflow-y-auto mb-4 pr-2">
//                 {messages.map((msg, index) => {
//                     // --- Notification messages (system notices) ---
//                     if (msg.type === 'notification') {
//                         return (
//                             <div key={`note-${index}`} className="text-center my-2">
//                                 <span className="text-xs text-gray-400 italic bg-gray-700 px-2 py-1 rounded-full inline-flex items-center gap-1">
//                                     <FaInfoCircle /> {msg.text}
//                                 </span>
//                             </div>
//                         );
//                     }

//                     const isOwn = msg.user.id === (user.id || user._id);
//                     const containerClass = `mb-3 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`;
//                     const bubbleBaseClass = `p-2 rounded-lg max-w-full`;
//                     const bubbleClass = isOwn ? `${bubbleBaseClass} bg-teal-800` : `${bubbleBaseClass} bg-gray-700`;

//                     // Detect if message contains multiple lines -> treat as code block
//                     const isCodeBlock = typeof msg.text === 'string' && msg.text.includes('\n');

//                     return (
//                         <div key={msg.id || index} className={containerClass}>
//                             <div className={`relative`}>
//                                 <div className={bubbleClass}>
//                                     <div className="flex items-center justify-between gap-3">
//                                         <div className="text-xs text-teal-300 font-bold">{msg.user.name}</div>
//                                         {/* small timestamp */}
//                                         <div className="text-xs text-gray-400 ml-2">
//                                             {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
//                                         </div>
//                                     </div>

//                                     {isCodeBlock ? (
//                                         // Preserve formatting and allow copy
//                                         <div className="mt-2">
//                                             <div className="relative border border-gray-600 rounded-md">
//                                                 <pre className="whitespace-pre-wrap bg-[#0b1220] text-white p-3 rounded-md overflow-auto text-sm font-mono">
// {msg.text}
//                                                 </pre>
//                                                 <button
//                                                     onClick={() => copyToClipboard(msg.text)}
//                                                     className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
//                                                     title="Copy code"
//                                                 >
//                                                     <FaRegCopy />
//                                                 </button>
//                                             </div>
//                                         </div>
//                                     ) : (
//                                         // Normal single-line message (but still preserve any internal newlines if present)
//                                         <p className="text-white text-sm break-words whitespace-pre-wrap mt-2">{msg.text}</p>
//                                     )}
//                                 </div>

//                                 <MessageSeen seenBy={msg.seenBy} currentUser={user} />
//                             </div>
//                         </div>
//                     );
//                 })}
//                 <div ref={messagesEndRef} />
//             </div>

//             <form onSubmit={handleSendMessage} className="flex gap-2">
//                 {/* Multiline textarea so users can paste code blocks directly */}
//                 <textarea
//                     value={currentMessage}
//                     onChange={(e) => setCurrentMessage(e.target.value)}
//                     placeholder="send codes ..etc"
//                     rows={3}
//                     className="flex-grow px-3 py-0 bg-gray-00 border border-gray-600 rounded-md text-white resize-none focus:outline-none"
//                 />
//                 <button type="submit" className="py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-md flex items-center gap-2">
//                     <FaPaperPlane />
//                     <span className="hidden sm:inline">Send</span>
//                 </button>
//             </form>
//         </div>
//     );
// };

// export default ChatBox;

import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaInfoCircle, FaRegCopy, FaCheck } from 'react-icons/fa';
import MessageSeen from './MessageSeen';

const ChatBox = ({ socket, user, roomId, messages }) => {
    const [currentMessage, setCurrentMessage] = useState('');
    const [copiedMessageId, setCopiedMessageId] = useState(null); // store copied message id
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
    useEffect(scrollToBottom, [messages]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if ((currentMessage || '').toString().trim() && socket) {
            socket.emit('chat:message', {
                roomId,
                message: currentMessage,
                user: { name: user.name, id: user.id || user._id }
            });
            setCurrentMessage('');
        }
    };

    const copyToClipboard = async (text, msgId) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedMessageId(msgId);
            setTimeout(() => setCopiedMessageId(null), 2000); // show tick for 2 sec
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    return (
        <div className="bg-dark-charcoal p-4 rounded-lg h-full flex flex-col">
            <h2 className="text-lg font-bold mb-4 text-white">Room Chat</h2>
            <div className="flex-grow overflow-y-auto mb-4 pr-2">
                {messages.map((msg, index) => {
                    if (msg.type === 'notification') {
                        return (
                            <div key={`note-${index}`} className="text-center my-2">
                                <span className="text-xs text-gray-400 italic bg-gray-700 px-2 py-1 rounded-full inline-flex items-center gap-1">
                                    <FaInfoCircle /> {msg.text}
                                </span>
                            </div>
                        );
                    }

                    const isOwn = msg.user.id === (user.id || user._id);
                    const containerClass = `mb-3 flex flex-col ${isOwn ? 'items-end' : 'items-start'}`;
                    const bubbleBaseClass = `p-2 rounded-lg max-w-full`;
                    const bubbleClass = isOwn ? `${bubbleBaseClass} bg-teal-800` : `${bubbleBaseClass} bg-gray-700`;

                    const isCodeBlock = typeof msg.text === 'string' && msg.text.includes('\n');

                    return (
                        <div key={msg.id || index} className={containerClass}>
                            <div className={`relative`}>
                                <div className={bubbleClass}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-xs text-teal-300 font-bold">{msg.user.name}</div>
                                        <div className="text-xs text-gray-400 ml-2">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>

                                    {isCodeBlock ? (
                                        <div className="mt-2">
                                            <div className="relative border border-gray-600 rounded-md">
                                                <pre className="whitespace-pre-wrap bg-[#0b1220] text-white p-3 rounded-md overflow-auto text-sm font-mono">
{msg.text}
                                                </pre>
                                                <button
                                                    onClick={() => copyToClipboard(msg.text, msg.id || index)}
                                                    className="absolute top-2 right-2 bg-gray-800 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                                                    title="Copy code"
                                                >
                                                    {copiedMessageId === (msg.id || index) ? <FaCheck /> : <FaRegCopy />}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-white text-sm break-words whitespace-pre-wrap mt-2">{msg.text}</p>
                                    )}
                                </div>

                                <MessageSeen seenBy={msg.seenBy} currentUser={user} />
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
                <textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="send codes ..etc"
                    rows={3}
                    className="flex-grow px-3 py-0 bg-gray-00 border border-gray-600 rounded-md text-white resize-none focus:outline-none"
                />
                <button type="submit" className="py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-md flex items-center gap-2">
                    <FaPaperPlane />
                    <span className="hidden sm:inline">Send</span>
                </button>
            </form>
        </div>
    );
};

export default ChatBox;
