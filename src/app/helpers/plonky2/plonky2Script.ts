// This file exports the PLONKY2_SCRIPT string used for the SpeedReader and educational UI in the app.

const PLONKY2_SCRIPT = `Hey! So today I want to explain how Plonky2 helps prove something called an RSA-based group signature.

Don't worry, that might sound intense — but we're going to break it down like LEGOs.

What Are We Even Trying to Do?

Imagine there's a group of people, and someone in that group signs a message. But we don't want to say who signed it.

We just want to prove:

"Someone from the group definitely signed this, and they did it correctly."

That's called a group signature.

Now, RSA is a kind of digital signature that works with really big numbers — like hundreds of digits long.

But Plonky2 Can't Handle Huge Numbers

Plonky2 is a special kind of math machine. It helps us prove things are true without showing the work.

But there's a catch — Plonky2 only knows how to do tiny math steps like this:

"Take two numbers, multiply them, add a third number… and check if it equals a fourth number — all inside a certain range."

That's it. Over and over.
Thousands — even millions — of these tiny steps.

So to work with huge numbers like RSA, we have to break them down into little chunks. Like LEGO bricks.

Each brick might be 32 or 64 bits big. Just the right size for Plonky2 to handle.

What Actually Happens Inside?

Here's the big math we're trying to prove:

s^e ≡ H(m) mod n

That's the RSA equation.
	•	s is the signature
	•	e is a public exponent — usually just a small constant
	•	H(m) is a hashed message
	•	n is a big public number that the whole group shares

But again — Plonky2 can't deal with numbers this huge directly.
So we split them into limbs, or chunks. And then:
	•	Multiply the chunks
	•	Add carry bits
	•	Square the results over and over (because we're doing exponentiation)
	•	And finally check that the result is correct.

All That Math Becomes… This

Every step becomes a really simple formula:

a × b + c = d

Plonky2 does this again and again, for every piece of the puzzle. It's like doing the world's most complicated LEGO build… one tiny move at a time.

And Then Comes the Magic

Once we've laid out all the steps…

Plonky2 compresses all of that work into a tiny proof — like a digital receipt that says:

"Trust me, I did all the work correctly. You don't need to see it all."

This is done with some fancy math under the hood:
Things like polynomials, Merkle trees, and something called FRI.

You don't need to know all the details — just that it lets someone else check the proof really fast and without learning anything private.

So What Happens in Practice?

Here's the flow:
	1.	Someone in the group signs a message with RSA, and hides their identity with a blinding trick.
	2.	They build a Plonky2 circuit to prove:
→ "Hey, this signature is valid for someone in the group — but I won't tell you who."
	3.	They make a zero-knowledge proof from that circuit.
	4.	Anyone can verify the proof — in milliseconds — and be sure it's legit.

The Takeaway

Plonky2 is a clever tool that:
	•	Can only do really tiny math steps,
	•	But can pretend to do big math by chaining lots of those steps together,
	•	And can prove things like "Someone in this group signed this message"…
	•	Without revealing any secrets.

It's all based on breaking big ideas down into tiny trusted steps.
Just like building something incredible — out of a pile of LEGOs.`;

export default PLONKY2_SCRIPT; 