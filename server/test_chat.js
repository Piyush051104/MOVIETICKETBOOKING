import axios from 'axios';

async function test() {
    try {
        const response = await axios.post('http://localhost:3000/api/agent/chat', {
            message: "What movies do you have right now?",
            conversationHistory: []
        });
        console.log("Success:", response.data);
    } catch (error) {
        console.log("Error Status:", error.response?.status);
        console.log("Error Data:", error.response?.data);
    }
}
test();
