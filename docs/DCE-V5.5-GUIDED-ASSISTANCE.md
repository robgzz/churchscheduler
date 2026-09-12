# DCE V5.5 — Guided Assistance Architecture

The DCE now separates **resource understanding** from **user goal assistance**.

Pipeline:

`Input → Normalization → Assistance Planner → Command Frame → Conversation Goal → Procedure Registry → Slot Collection → Permission → Preview/Confirmation → Execution → Verification → Response`

A procedure definition contains the canonical explanation, manual steps, execution capability, required permission, and Chat Hub start intent. This keeps help text and executable behavior aligned.

Supported conversational modes include QUERY, COMMAND, HOW_TO, HELP, EXPLAIN, WHY, FOLLOW_UP, CONFIRMATION and CANCELLATION.

V5.5 first-class procedures include song selection, responsible program administrator, member ministry eligibility, planned unavailability, replacement requests, prayer requests and bulletin upload.
