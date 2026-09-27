# OpenRouter Demo

## Introduction
This repository contains the source code for an OpenRouter demo application. The application is a simple chatbot that uses OpenRouter's Auto Route to automatically pick a LLM for answering questions ask by the user. When users ends a chat they will be asked to evaluate the experience by selecting thumbs up or down. The application then summarizes the votes, along with other metrics, which can give an indication of which model gives the best answers, and what the price per up-voted session is. The stats can e.g. be used to make decisions about whitelisting and blacklisting models to ensure the quality of the chatbot’s answers. 

Please note this is just a simple demo application built in ~1 hour, and a very simplified version of something you would use in production with real users. 

You can test the application here: [OpenRouter Demo](https://openrouter-demo-412589038856.us-west1.run.app/)

### How to use: 
* Interact with the chatbot by using the text field and Send button at the bottom of the page
* When you are done, click the End Chat button at the top of the page
* Evaluate your experience by clicking thumbs up or down, and click End Chat
* Click Stats at the top of the page to see a breakdown of basic metrics collected from chats

## Motivation
Using OpenRouter is an easy way to utilize multiple LLMs without having to go through the hassle of doing the actual implementation of each LLM and keeping track of API changes of all LLMs. It’s also a great way to avoid prepaying multiple accounts, with OpenRouter you just pay into ONE account. 

But…. While Auto Route provides great cost, speed and fallbacks, the drawback is that LLM responses may be less deterministic, less consistent and provide less control - things that may matter for applications in production. 

## Solution
OpenRouter does support whitelisting/blacklisting of LLMs so routing can be limited to LLMs the developer approves of - but how can you decide which LLMs to use or which to exclude? Through user feedback.

It’s common to see applications such as ChatGPT and Claude Code have thumbs up/down buttons under each response, so users can rate the response. This demo application is a simple chatbot, using OpenRouter with Auto Route, and when a users end a chat session, they can give the session a thumbs up or down.

The application tracks the ratings, along with other metrics, and makes a summarized table sorted by LLM name, which shows user rating, average session cost, cost per upvote, token consumption etc. This data allows the developer to make decisions about which LLMs to favor and which to exclude. Over time the best LLMs for the use case can be identified and the application will become more deterministic and consistent in response quality. 

## Technical Description
This is a small Node/TypeScript chatbot application that talks to LLMs through OpenRouter, with both a CLI and a web UI, plus usage/cost logging and a stats dashboard. It lives at chat-app. A live version of the application can be found here: [OpenRouter Demo](https://openrouter-demo-412589038856.us-west1.run.app/)

The chatbot application uses the following libraries/SDKs:

* OpenRouter  AI SDK Provider ([npm](https://www.npmjs.com/package/@openrouter/ai-sdk-provider))
* Vercel AI SDK ([npm](https://www.npmjs.com/package/ai))
* Express ([npm](https://www.npmjs.com/package/express))
* dotenv ([npm](https://www.npmjs.com/package/dotenv))

### Core Functionality
The chatbot functionality can be into four core categories: Backend, UI, Stats, OpenRouter Client.

* Backend - API to support frontend functionality
* OpenRouter Client - The interface between the chatbot application and LLM models
* UI - A very simple UI for interacting with the chatbot
* Stats - Get insights about how models are performing and which models give the best cost/performance relation 

The project stated out as a CLI-version, and the UI was added later, so the API is still supporting CLI commands.

## Learnings
The hypothesis starting this project was, that using OpenRouter’s Auto Route was associated with pros and cons, and the cons can to some extend be mitigated through user feedback. The pros are significant enough to build solutions to mitigate the cons - as an alternative to just picking specific LLMs.

While sample sizes for tests of this sample application has been rather small, even with a few sessions trends starts to be established and could be used to start making decisions. Tests also indicates that measuring LLM performance is relevant, and in many cases a cheaper model will deliver sufficient performance. The bottom line is, if you don’t evaluate, you don’t know how to configure OpenRouter to deliver the ideal results for production environments. 
