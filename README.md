
# AI Work Simulator (AIWEX)

AIWEX (**AI Work Experience Simulator**) is an experimental platform that simulates a **real-world work environment** using **AI agents** and **collaborative tools**.

Just like in an organization, different **AI agents take on different roles** (e.g., Developer, Tester, Manager, Designer). A human user can **join as a team member** in any role and collaborate with these AI agents to **gain hands-on, real-world work experience** in a simulated environment.

---

## 🚀 Features (Work-in-Progress)

* 🏢 **Organizational Simulation**
  Multiple AI agents simulate a real company environment with role-specific responsibilities.

* 💬 **Chat Collaboration**
  Users and AI agents collaborate via a chat interface, similar to workplace chat tools.

* 🌐 **GitHub Collaboration (Partially Implemented)**

  * AI agents can create repositories on GitHub.
  * Agents can push code according to project requirements.
  * Agents can report progress via chat.

* 👥 **User Participation**
  Users can take on specific roles and collaborate with AI agents as if they are part of the same team.

---

## 🛠️ Tech Stack

* **Frontend**: [Next.js](https://nextjs.org/) (React + TypeScript)
* **Backend**: [NestJS](https://nestjs.com/) (TypeScript)
* **Database**: [MongoDB](https://www.mongodb.com/)
* **AI Integration**: [OpenAI API](https://openai.com/)
* **Collaboration**: GitHub API

---

## 📌 Current Status

✅ Implemented:

* AI agents can **create GitHub repos**.
* Agents can **push code** and **report updates via chat**.

🚧 In Progress:

* Role-based AI agent collaboration.
* Full project workflow simulation.
* Enhanced user–AI collaboration features.

🔮 Planned:

* Advanced project management (tasks, deadlines, sprint boards).
* Integration with CI/CD pipelines.
* Multi-agent communication and conflict resolution.

---

## 🎯 Project Vision

AIWEX aims to **bridge the gap between learning and real-world experience** by allowing developers, students, and professionals to **practice working in a realistic team environment** powered by AI.

This could become a **next-generation learning and onboarding tool** where users build real projects alongside AI colleagues.

---

## 🚀 Getting Started (for Developers)

> ⚠️ Project is under active development. Setup instructions may change.

1. **Clone the repo**

   ```bash
   git clone https://github.com/abhicsng007/AI-work-Simulator.git
   cd AIWEX
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup environment variables**
   Create a `.env.local` file in the project root with:

   ```env
   OPENAI_API_KEY=your_openai_api_key
   MONGODB_URI=your_mongodb_connection_string
   GITHUB_TOKEN=your_github_token
   GITHUB_USERNAME= github_username
   PORT=3001
   ```

4. **Run the app**

   * Frontend (Next.js):

     ```bash
     npm run dev
     ```
   * Backend (NestJS):

     ```bash
     npm run start:dev
     ```

---

## 🤝 Contributing

Since this project is experimental, contributions, ideas, and feedback are welcome!
Feel free to fork the repo, open issues, or submit pull requests.

---

## 📜 License

MIT License. See [LICENSE](LICENSE) for details.

---

