
async function checkNewKey() {
    const apiKey = "AIzaSyBeFZIeqO6YHgeQLwe8TJYnLFJvPes__4s";

    try {
        console.log("Testing new paid key...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key=${apiKey}`);
        const data = await response.json();

        if (data.name) {
            console.log("SUCCESS: New key is valid and connected to:", data.name);
        } else {
            console.log("Error with new key:", data);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

checkNewKey();
