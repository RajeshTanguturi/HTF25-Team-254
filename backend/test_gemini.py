import os
import google.generativeai as genai

def test_api_key():
    """
    Sends a simple prompt to the Gemini API to test the provided key.
    """
    try:
        # --- IMPORTANT ---
        # Replace the placeholder below with your actual API key.
        api_key = "AIzaSyDGf0yS2u0bzTKP-qEK8dcCz79a-X-aMwA" 
        
        if not api_key or "YOUR_API_KEY_HERE" in api_key:
            print("ERROR: Please replace 'YOUR_API_KEY_HERE' with your actual Gemini API key.")
            return

        # Configure the generative AI client
        genai.configure(api_key=api_key)

        # Create the model
        model = genai.GenerativeModel('gemini-2.0-flash')

        # Send a simple prompt
        print("Sending a test prompt to Gemini...")
        response = model.generate_content("In one sentence, what is a large language model?")

        # Print the response
        print("\n--- Gemini's Response ---")
        print(response.text)
        print("\nSUCCESS: Your API key is working correctly!")

    except Exception as e:
        print("\n--- An Error Occurred ---")
        print(f"ERROR: The API call failed. This could be due to an invalid API key or other issues.")
        print(f"Details: {e}")

if __name__ == "__main__":
    test_api_key()