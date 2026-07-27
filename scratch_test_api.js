async function test() {
  const token = "ab6c6829116292f376c83d3f01f118f8034846a53e2e159fe01677934f6f71b4";
  try {
    const res = await fetch(`https://api.ekyte.com/v1.0/workspaces?apiKey=${token}`);
    console.log("Status:", res.status);
    const json = await res.json();
    if (json.data && json.data.length > 0) {
      console.log("First workspace:", JSON.stringify(json.data[0], null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
