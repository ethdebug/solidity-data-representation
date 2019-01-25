The EVM has a number of locations where data can be stored.  We will be
concerned with four of them: The stack, storage, memory, and calldata.  (We will
also be incidentally concerned with code, but we will mostly ignore it.  We will
ignore returndata entirely.  There are also some other "special locations" that
I will mention briefly in the calldata section but will mostly ignore.)

The stack and storage are made of words ("slots"), while memory and calldata are
made of bytes; however, we will use some conventions to ignore this distinction.
We will, for the stack and storage, conventionally consider the large end of
each word to be the earlier (left) end; that is to say, everything is big-endian
unless stated otherwise.

The other locations we will consider as conventionally divided up into words
("slots") of 32 bytes each, with the earlier end of each word being the large
end; however, we will start these slots at the beginning of the object we are
decoding, and objects do not always start on multiples of `0x20`, so the slot
boundaries may not be the conventional ones.  In any case, regardless of the
starting point, everything is construed as big-endian unless stated otherwise.

With these conventions, we can ignore the distinction between the slot-based
locations and the byte-based locations.  (My apologies in advance for the abuse
of terminology that results from this, but I think using these conventions here
saves more trouble than it causes.)

(For what its worth, objects in calldata always start at a [4-byte
offset](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset) from a multiple of `0x20`.)

Memory and calldata will always be accessed through pointers to such; as such,
we will only discuss concrete data layout for storage and (a little bit) for the
stack, as those are the only locations we'll access without a pointer (but for
the stack we'll mostly rely on the debugger having other ways of determining
location).
