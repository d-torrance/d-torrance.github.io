---
layout: post
title: strange adventures in algebra
---

I've been catching up on my comic book reading recently, and saw a fun little math problem at the bottom of the first page of Tom King's *Strange Adventures* #2.  Mr. Terrific's T-spheres are quizzing him on a little math problem:

> In the equation $$x^2 + mx + n = 0$$, $$m$$ and $$n$$ are integers.  The only possible value of of $$x$$ is $$-3$$.  What is the value of $$m$$?

Mr. Terrific correctly guesses, "six", apparently nearly instantly.  Why is this the answer?

This is a quadratic equation, and so it has either zero, one, or two real solutions.  Recall the *quadratic formula*, i.e., a quadratic equation of the form $$a x^2 + bx + c = 0$$ has solution(s):

$$ x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} $$

In particular, we have a unique solution when $$b^2 - 4ac = 0$$, and in this case, this solution is

$$x = -\frac{b}{2a}$$

In Mr. Terrific's equation, we have $$a = 1$$, $$b = m$$, and $$c = n$$, so the unique solution is:

$$x = -\frac{m}{2\cdot 1} = -\frac{m}{2}$$

Since the T-sphere says that $$x = -3$$, we have

$$-3 = -\frac{m}{2}$$

$$m = 6$$

The T-sphere doesn't ask Mr. Terrific the value of $$n$$, but we can figure it out.  Recall that $$b^2 - 4ac = 0$$, or in this case:

$$m^2 - 4\cdot 1\cdot n = 0$$

$$6^2 - 4n = 0$$

$$4n = 36$$

$$n = 9$$

Also, the T-sphere didn't really need to specify that $$m$$ and $$n$$ were integers.  Indeed, these are the only *complex numbers* that work.

Geometrically, we're looking for a parabola with an $$x$$-intercept of $$-3$$, and so it must have equation

$$y = a(x + 3)^2 = a(x^2 + 6x + 9) = ax^2 + 6ax + 9a$$,

but we know that $$a = 1$$, and so we obtain the same result.
