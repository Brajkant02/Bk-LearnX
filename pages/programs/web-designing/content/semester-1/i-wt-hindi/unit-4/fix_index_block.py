from pathlib import Path

path = Path('index.html')
text = path.read_text('utf-8')
start = 8140
end = 28165
replacement = '''        <h4>Simple JavaScript Example</h4>
        <pre>&lt;button onclick="alert('Welcome to JavaScript')"&gt;Click me&lt;/button&gt;</pre>
        <div class="info-box">
          <b>Output:</b><br>
          Button click करने पर एक alert box दिखाई देगा।
        </div>
        <div class="note-box">
          <b>HTML, CSS और JavaScript का रोल</b>
          <table>
            <tr><th>Technology</th><th>Work</th></tr>
            <tr><td>HTML</td><td>Webpage structure</td></tr>
            <tr><td>CSS</td><td>Webpage design/layout</td></tr>
            <tr><td>JavaScript</td><td>Webpage logic और interactivity</td></tr>
          </table>
        </div>
        <div class="remember-box">
          <b>Remember:</b><br>
          JavaScript webpage को interactive और dynamic बनाता है।
        </div>
'''
path.write_text(text[:start] + replacement + text[end:], 'utf-8')
print('Replaced broken HTML block successfully.')
