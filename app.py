import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityReleaseNotesViewer/1.0'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
    except Exception as e:
        print(f"Error fetching feed: {e}")
        return []

    try:
        root = ET.fromstring(xml_data)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []
        
    # Atom namespace
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry_el in root.findall('atom:entry', ns):
        title = entry_el.find('atom:title', ns)
        date_str = title.text.strip() if title is not None else "Unknown Date"
        
        updated = entry_el.find('atom:updated', ns)
        updated_str = updated.text.strip() if updated is not None else ""
        
        # Extract link
        link = ""
        link_el = entry_el.find("atom:link[@rel='alternate']", ns)
        if link_el is not None:
            link = link_el.attrib.get('href', '')
        else:
            link_el = entry_el.find("atom:link", ns)
            if link_el is not None:
                link = link_el.attrib.get('href', '')

        content_el = entry_el.find('atom:content', ns)
        content_html = content_el.text if content_el is not None else ""
        
        # Parse the HTML content to extract individual updates
        # Google's feed uses <h3>Type</h3> followed by paragraphs/lists
        updates = []
        # Find all sections starting with <h3>Type</h3> and capturing everything until the next <h3> or end of string
        matches = re.findall(r'<h3>(.*?)</h3>(.*?)(?=(?:<h3>|$))', content_html, re.DOTALL)
        
        if matches:
            for match in matches:
                update_type = match[0].strip()
                update_text = match[1].strip()
                updates.append({
                    'type': update_type,
                    'content': update_text
                })
        else:
            # Fallback if no <h3> tags are found
            updates.append({
                'type': 'Update',
                'content': content_html.strip()
            })
            
        entries.append({
            'date': date_str,
            'updated': updated_str,
            'link': link,
            'updates': updates
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    notes = fetch_and_parse_feed()
    return jsonify(notes)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
