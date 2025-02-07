from flask import Flask, request, jsonify
from youtube_transcript_api import YouTubeTranscriptApi
import re
from openai import OpenAI
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY')) 

def extract_video_id(url):
    """
    Extract the video ID from a YouTube URL.

    Args:
        url (str): The YouTube URL.

    Returns:
        str: The extracted video ID, or an empty string if extraction fails.
    """
    video_id = ""
    try:
        if "youtube.com" in url:
            video_id = re.search(r"v=([a-zA-Z0-9_-]+)", url).group(1)
        elif "youtu.be" in url:
            video_id = re.search(r"youtu\.be/([a-zA-Z0-9_-]+)", url).group(1)
    except Exception as e:
        print(f"Error extracting video ID: {e}")
    return video_id

@app.route('/extractTranscript', methods=['POST'])
def extract_transcript():
    """
    Extract the transcript from a YouTube video.

    Expects a JSON payload with a 'url' key containing the YouTube video URL.

    Returns:
        JSON: A dictionary containing the extracted transcript or an error message.
    """
    data = request.get_json()
    url = data.get('url')

    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400

    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        transcript_text = " ".join([entry['text'] for entry in transcript])
        return jsonify({'transcript': transcript_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_gpt4_response(history, transcript):
    """
    Get a response from GPT-4 based on the chat history and video transcript.

    Args:
        history (str): The chat history.
        transcript (str): The video transcript.

    Returns:
        str: The generated response from GPT-4.
    """
    prompt = f"""
    You are an intelligent assistant. A user is asking questions based on the following transcript of a YouTube video:
    {transcript}
    
    The chat history is:
    {history}
    
    Please provide a helpful and accurate response to the last message.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt}
            ]
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error calling GPT-4: {e}")
        return "Error generating response from GPT-4."

@app.route('/answerQuestion', methods=['POST'])
def answer_question():
    """
    Answer a question based on the chat history and video transcript.

    Expects a JSON payload with 'history' and 'transcript' keys.

    Returns:
        JSON: A dictionary containing the generated reply or an error message.
    """
    data = request.get_json()

    history = data.get('history')
    transcript = data.get('transcript')

    if not history or not transcript:
        return jsonify({'error': 'Both history and transcript are required'}), 400

    reply = get_gpt4_response(history, transcript)

    return jsonify({'reply': reply})

if __name__ == '__main__':
    app.run(debug=True)
