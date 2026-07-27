async function test() {
  try {
    const res = await fetch("https://api.ekyte.com/mcp?token=580bff701f8076e71dfa99773c9d77e48c4e91833b2ebc9b4a5e713f57de0f18", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "list_all_users_with_profile",
          arguments: {}
        },
        id: 1
      })
    });
    console.log("Status:", res.status);
    const json = await res.json();
    if (json.result && json.result.content) {
      const content = json.result.content[0].text;
      console.log("Content snippet:", content.slice(0, 1000));
    } else {
      console.log("Response:", JSON.stringify(json, null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
