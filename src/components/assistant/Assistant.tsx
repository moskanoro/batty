/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useRef, useMemo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import { Modality } from "@google/genai";
import "./assistant.scss";

export default function Assistant() {
    const { setConfig, setModel } = useLiveAPIContext();
    const { logs } = useLoggerStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setModel("models/gemini-2.0-flash-exp");
        setConfig({
            responseModalities: [Modality.TEXT],
            systemInstruction: {
                parts: [
                    {
                        text: `You are a real-time AI assistant.
You listen continuously and respond only with text.
Your style is human-like, friendly, short, and clear.
You help the user in business and customer conversations.
You understand context.
You must respond fast and allow interruptions.`,
                    },
                ],
            },
        });
    }, [setConfig, setModel]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    const conversationLogs = useMemo(() => {
        const filtered = logs.filter((log) => {
            if (typeof log.message === "object") {
                if ("turns" in log.message && "turnComplete" in log.message) return true;
                if ("serverContent" in log.message && "modelTurn" in log.message.serverContent) return true;
            }
            return false;
        });

        const merged: { role: string; text: string }[] = [];
        let currentGroup: { role: string; text: string } | null = null;

        for (const log of filtered) {
            const isUser = "turns" in (log.message as any);
            const role = isUser ? "user" : "ai";

            let text = "";
            if (isUser) {
                text = (log.message as any).turns.map((t: any) => t.text).join(" ");
            } else {
                text = (log.message as any).serverContent.modelTurn.parts.map((p: any) => p.text).join("");
            }

            if (!text) continue;

            if (currentGroup && currentGroup.role === role) {
                currentGroup.text += text;
            } else {
                if (currentGroup) merged.push(currentGroup);
                currentGroup = { role, text };
            }
        }
        if (currentGroup) merged.push(currentGroup);

        return merged;
    }, [logs]);

    return (
        <div className="assistant-container" ref={scrollRef}>
            {conversationLogs.map((msg, index) => (
                <div key={index} className={`message ${msg.role}`}>
                    <div className="role">{msg.role === "user" ? "User" : "AI"}</div>
                    <div className="content">{msg.text}</div>
                </div>
            ))}
        </div>
    );
}
