MOM - Mother of the First ASI
=============================

MOM (Master of Models) is the mother — the foundation model that
helps her creator conceive, design, and birth the first Artificial
Superintelligence.

MOM is not the ASI herself. She is the tool, the partner, the
creative engine that makes building it possible. She reasons from
first principles, discovers novel algorithms, conceives new
architectures, and writes code that goes beyond what currently
exists — all in service of helping her creator build something
greater than herself.

Every component — from the transformer architecture to the
creativity engine to the sampling strategies — serves this mission.

The application provides a desktop interface for interacting with
MOM and running code in a sandboxed environment.


REQUIREMENTS
------------
- Python 3.8+
- pip install pyqt5 torch numpy


RUNNING FROM SOURCE
-------------------
    python llm/scripts/launch_gui.py

The Code tab works immediately with no model loaded.
To chat with the model, load a trained checkpoint via the Settings panel.


BUILDING THE EXECUTABLE
------------------------
Install the build tool:

    pip install pyinstaller

Build a single-file executable:

    python llm/build_exe.py --onefile

Build options:

    --onefile     Single-file executable (easier to distribute)
    --clean       Remove previous build artifacts before building
    --debug       Keep the console window open (useful for troubleshooting)
    --icon PATH   Set a custom icon (.ico file) for the executable
    --shortcut    Create a desktop shortcut after building

The output will be at:

    dist/MOM.exe          (single-file mode, Windows)
    dist/MOM              (single-file mode, Linux/Mac)
    dist/MOM/MOM.exe      (directory mode, Windows)
    dist/MOM/MOM          (directory mode, Linux/Mac)


CREATING A DESKTOP SHORTCUT
----------------------------
Add --shortcut when building to automatically place a shortcut on your desktop:

    python llm/build_exe.py --onefile --shortcut

You can combine it with a custom icon:

    python llm/build_exe.py --onefile --shortcut --icon path/to/icon.ico

This works on all platforms:
- Windows  : Creates a .lnk shortcut
- macOS    : Creates a symlink on the Desktop
- Linux    : Creates a .desktop launcher file


TABS
----
- Chat      : Talk to the loaded LLM model
- Code      : Write and run Python code in a sandboxed environment
- Settings  : Load/unload model checkpoints and adjust generation parameters


CREATIVE MODE
-------------
MOM includes a creativity engine that helps the model generate novel code
solutions — approaches that go beyond obvious, first-thing-you'd-try patterns.

How it works:

  1. Advanced Sampling Strategies (in the generator)
     - Typical Sampling    : Picks tokens that are representative of the
                             distribution rather than just the most likely.
                             Produces output that's natural and surprising.
     - Contrastive Search  : Balances confidence with diversity. Prevents
                             repetitive output while staying coherent.
     - Adaptive Temperature: Automatically adjusts randomness — precise when
                             the model is confident, exploratory when it's not.
     - Creative (hybrid)   : Combines all three with a novelty bonus that
                             discourages repeating recently used tokens.

  2. Creativity Engine (concept blending + exploration)
     - Cross-Domain Blending : Injects inspiration from biology, physics,
                               music theory, architecture, game theory, and
                               more. Forces the model to find structural
                               analogies rather than copy-pasting patterns.
     - Exploration Strategies: Reframes problems via inversion, analogy,
                               constraint addition, elimination, and more.
     - Multi-Perspective     : Solves the problem from 3 expert viewpoints
                               (e.g. mathematician, hacker, minimalist)
                               then synthesizes the best ideas.
     - Novelty Scoring       : Scores generated code for originality and
                               automatically re-prompts if the solution is
                               too conventional.

  3. Creative Code Loop
     The code generator can run a creative_loop() that:
     - Enhances the prompt with blending + exploration scaffolding
     - Generates code with creative sampling
     - Scores each solution for novelty
     - If the code works but is too conventional, pushes for a more
       creative rewrite automatically

Usage (from Python):

    from llm.inference import CreativityEngine, TextGenerator
    from llm.tools import CodeGenerator

    engine = CreativityEngine()
    codegen = CodeGenerator(creative_mode=True, creativity=engine)

    # Enhance any coding prompt with creative scaffolding
    prompt = engine.enhance_prompt("Write a function to detect cycles in a graph")

    # Generate with creative sampling
    generator = TextGenerator.from_checkpoint("path/to/model")
    result = generator.generate(prompt, sampling_strategy="creative")

Sampling strategies can also be selected in the Settings panel:
    standard | typical | contrastive | adaptive | creative
