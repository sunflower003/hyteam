// Agent registry for managing agents
const agents = new Map();

const registerAgent = (name, agent) => {
  agents.set(name, agent);
};

const getAgent = (name) => {
  return agents.get(name);
};

module.exports = { registerAgent, getAgent };
