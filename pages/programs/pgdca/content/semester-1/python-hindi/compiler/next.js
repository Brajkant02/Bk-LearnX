// Skulpt configuration ke liye output function
        function outf(text) {
            var outputArea = document.getElementById("output-area");
            outputArea.innerHTML = outputArea.innerHTML + text;
        }

        // Skulpt configuration ke liye builtin read function
        function builtinRead(x) {
            if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
                throw "File not found: '" + x + "'"return-sk.builtinfiles["files"x//run-button-logic-function-runpython-var-code-document.getelementbyid("code-input"value-var-outputarea-document.getelementbyid("output-area"item//output-area-ko-execution-se-pehle-clear-karna-outputarea.innerhtml = ""outputarea.classname = ""item//remove-error-classes-if-any//skulpt-configure-karna-sk.pre = "output-area"sk.configure({ output: outf, read: builtinread });

            //code-run-karna-async-var-mypromise-sk-misceval-asynctopromise-function-return-sk.importmainwithbody("<stdin>"false-code-true//agar-code-me-error-aaye-to-catch-karke-display-karna-mypromise-catch-function-err-outputarea-innerhtml-err-tostring-outputarea.classname = "error-text"item//clear-code-button-logic-function-clearcode-document.getelementbyid("code-input"item.value = ""item//clear-result-button-logic-function-clearresult-document.getelementbyid("output-area"item.innerhtml = ""document.getelementbyid("output-area"item.classname = "";
        }
