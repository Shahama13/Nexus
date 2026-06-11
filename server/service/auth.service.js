import { OpenAI } from "openai";

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const streamChat = async (req, res) => {
    const { messages } = req.body

    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    try {
        const stream = await client.chat.completions.create({
            model: "gpt-5.5",
            messages,
            stream: true,
        });
        let token
        for await (const chunk of stream) {
            token = chunk.choices[0]?.delta?.content
            console.log(token)
            if (token) {
                res.write(
                    `data: ${JSON.stringify({ token })}\n\n`
                )
            }
        }

        res.write(
            `data: ${JSON.stringify({ done: true })}\n\n`
        )
        
        res.end()
    } catch (error) {
        console.error(error)
        res.status(500).end()
    }

}


