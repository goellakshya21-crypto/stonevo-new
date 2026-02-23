
async function listAllModels() {
    const apiKey = "AIzaSyBBfoSHCthUnkdm1b3BLFkNIWVmXA_n6Rg";

    try {
        console.log("Listing models via native fetch...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("AVAILABLE MODELS:");
            data.models.forEach(m => console.log(` - ${m.name}`));
        } else {
            console.log("No models found or error:", data);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

listAllModels();
