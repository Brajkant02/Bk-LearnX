const subjectSelect = document.getElementById('subject');
        const unitSelect = document.getElementById('unit');
        const chapterHeading = document.getElementById('chapterName');
        const currentChapter = document.getElementById('currentChapter');
        const unitCards = Array.from(document.querySelectorAll('unit-card'));

        const subjectUnits = {
            bcit: [
                'Unit-1: Fundamentals of Computer',
                'Unit-2: Data Representation',
                'Unit-3: DOS & Windows Operating Systems  ',
                'Unit-4: Linux Operating System ',
                'Unit-5: Fundamentals of Internet '
            ],

            python: [
                'Unit-1: Introduction',
                'Unit-2: Basic Python Syntax ',
                'Unit-3: Language Components ',
                'Unit-4: Collections',
                'Unit-5: Functions',
                'Unit-6: Modules ',
                'Unit-7: Exceptions ',
                'Unit-8: Input and Output',
                'Unit-9: Classes in Python ',
                'Unit-10: Regular Expressions'
            ],

            dccn: [
                'Unit-1: Introduction to Data Communication',
                'Unit-2: Communication Methodologies',
                'Unit-3: Networks Basics',
                'Unit-4: Networking Models',
                'unit-5-tcp/ip-addressing',
                'Unit-6: Network Architecture',
                'Unit-7: Network Connectivity',
                'Unit-8: Network Administration',
                'Unit-9: Introduction to Wireless Networks'
            ],

            wdt: [
                'Unit-1: Web Development Introduction',
                'Unit-2: Hyper Text Markup Langauge(HTML)',
                'Unit-3: Cascading Style Sheets (CSS)',
                'Unit-4: Java Scripts',
                'Unit-5: JQUERY',
                'Unit-6: Bootstrap',
                'Unit-7: XML & JSON'
            ],

            oat: [
                'Unit-1 Word Processing',
                'Unit-2 Spread Sheet',
                'Unit-3 Presentation ',
                'Unit-4 Database ',
                'Unit-5 Google Office Tools '
            ]
        };

        function updateUnit() {
            const subject = subjectSelect.value;

            unitSelect.innerHTML = '<option value="">Select Unit</option>'if-subjectunits-subject-subjectunits-subject-foreach-unit-const-option-document.createelement('option'option-value-unit-option-textcontent-unit-unitselect.appendchild(option);
                });
            }

            updatechapter();
        }

        function getunitkey(unitvalue) {
            if (!unitvalue) {
                return ''const-match-unitvalue-tolowercase.match(/unit/d/return-match? match[0] : ''function-hideallcards-unitcards-foreach-card-card-classlist.remove('active'function-updatechapter-const-subject-subjectselect-value-const-unit-unitselect-value-const-selectedunitkey-getunitkey-unit-hideallcards-if-subject-chapterheading.textcontent = 'Select a subject'currentchapter.textcontent = 'Select subject and unit'return-if-unit-chapterheading-textcontent-subject-touppercase-study-material-currentchapter.textcontent = 'Select a unit'return-let-contentfound-false-unitcards-foreach-card-const-cardsubject-card.getattribute('data-subject'const-cardunit-card.getattribute('data-unit'if-cardsubject-subject-cardunit-selectedunitkey-card-classlist.add('active'contentfound-true-chapterheading-textcontent-subject-touppercase-unit-currentchapter-textcontent-subject-touppercase-unit-if-contentfound-chapterheading-textcontent-subject-touppercase-unit-currentchapter.textcontent = 'Content not added yet'subjectselect.addeventlistener('change'updateunit-unitselect.addeventlistener('change'updatechapter-document.addeventlistener('DOMContentLoaded', () => {
            updateUnit();
        });
