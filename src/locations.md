The EVM has a number of locations where data can be stored.  We will be
concerned with five of them: The stack, storage, memory, calldata, and code.
(We will ignore returndata.  There are also some other "special locations" that
I will mention briefly in the calldata section but will mostly ignore.)

The stack and storage are made of words ("slots"), while memory, calldata, and
code are made of bytes; however, we will basically ignore this distinction.  We
will, for the stack and storage, conventionally consider the large end of each
word to be the earlier (left) end; and, for the other locations, conventionally
consider the location as divided up into words ("slots") of 32 bytes, with the
earlier end of each word being the large end.  Or, in other words, everything
is big-endian (or construed as big-endian) unless stated otherwise.  With this
convention, we can ignore the distinction between the slot-based locations and
the byte-based locations.  (My apologies in advance for the abuse of
terminology that results from this, but I think using this convention here
saves more trouble than it causes.)

(For calldata, we will actually use a slightly different convention, as
[detailed later](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset),
but you can ignore that for now.  We will also occasionally use a different
convention in memory, as [also detailed later](#user-content-locations-in-detail-memory-in-detail), but you can again ignore that
for now.  Also, we will ignore the notion of "slots" in the case of code.)

Memory (with one exception to be [described
later](#user-content-locations-in-detail-memory-in-detail)) and calldata will
always be accessed through pointers to such; as such, we will only discuss
concrete data layout for storage, the stack, and code, as those are the only
locations we'll access without a pointer (but for the stack we'll mostly rely
on the debugger having other ways of determining location, and for code we'll
rely on other compiler output).
