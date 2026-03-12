#!/usr/bin/env node
import { Command } from "commander";
import { config } from "dotenv";
import chalk from "chalk";
import ora from "ora";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { MODEL_REGISTRY } from "@goat/core";

config();

const program = new Command();

program
  .name("goat")
  .description("GOAT CLI — Multi-model LLM router & royalty tools")
  .version("1.0.0");

// Chat command
program
  .command("chat")
  .description("Chat with the OmniLLM router")
  .argument("<message...>", "Your message")
  .option("-m, --model <model>", "Force a specific model")
  .option("--offline", "Use local models only (requires Ollama)")
  .action(async (messageParts: string[], opts) => {
    const message = messageParts.join(" ");
    const spinner = ora("Thinking...").start();

    try {
      let response: string;

      if (opts.model) {
        response = await callModel(opts.model, message);
      } else if (opts.offline) {
        response = await callOllama(message);
      } else {
        response = await autoRoute(message);
      }

      spinner.stop();
      console.log(chalk.yellow("\n" + response + "\n"));
    } catch (err) {
      spinner.fail(
        chalk.red(err instanceof Error ? err.message : "Request failed")
      );
      process.exit(1);
    }
  });

// List models
program
  .command("models")
  .description("List available models")
  .action(() => {
    console.log(chalk.yellow.bold("\nAvailable Models:\n"));
    for (const [key, model] of Object.entries(MODEL_REGISTRY)) {
      const available = isAvailable(model.provider);
      const status = available ? chalk.green("[available]") : chalk.gray("[no key]");
      console.log(
        `  ${chalk.yellow(key.padEnd(22))} ${model.name.padEnd(20)} ${status}`
      );
    }
    console.log();
  });

// Health check
program
  .command("health")
  .description("Check API connection")
  .action(async () => {
    try {
      const res = await fetch("http://localhost:5001/api/health");
      const data = await res.json();
      console.log(chalk.green("API is running:"), data);
    } catch {
      console.log(chalk.red("API not reachable at localhost:5001"));
    }
  });

function isAvailable(provider: string): boolean {
  switch (provider) {
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "google":
      return !!process.env.GOOGLE_API_KEY;
    case "ollama":
      return true;
    default:
      return false;
  }
}

async function autoRoute(message: string): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    return callModel("claude-sonnet-4.6", message);
  }
  if (process.env.OPENAI_API_KEY) {
    return callModel("gpt-4o", message);
  }
  return callOllama(message);
}

async function callModel(modelKey: string, message: string): Promise<string> {
  const model = MODEL_REGISTRY[modelKey];
  if (!model) throw new Error(`Unknown model: ${modelKey}`);

  if (model.provider === "anthropic") {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await client.messages.create({
      model: model.id,
      max_tokens: 2048,
      messages: [{ role: "user", content: message }],
    });
    const block = res.content[0];
    return block?.type === "text" ? block.text : "[No response]";
  }

  if (model.provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.chat.completions.create({
      model: model.id,
      messages: [{ role: "user", content: message }],
    });
    return res.choices[0]?.message?.content || "[No response]";
  }

  throw new Error(`Provider ${model.provider} not supported in CLI yet`);
}

async function callOllama(message: string): Promise<string> {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama3", prompt: message, stream: false }),
  });
  const data = await res.json();
  return data.response || "[No response from Ollama]";
}

program.parse();
