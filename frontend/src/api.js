// Every call to the backend lives here, so the components stay simple.

async function request(path, options) {
  const response = await fetch(path, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export function listStatements() {
  return request('/api/statements');
}

export function getStatement(id) {
  return request(`/api/statements/${id}`);
}

export function createStatement(text, name) {
  return request('/api/statements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, name }),
  });
}
