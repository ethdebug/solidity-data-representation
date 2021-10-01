### The stack in detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

The stack, as [mentioned above](#user-content-types-overview-types-and-locations), can hold only direct types and pointer types.
It's also the one location other than storage that we will access directly
rather than through storage, so we'll take some time to discuss data layout
on the stack.

#### The stack: Direct types and pointer types

The stack is, as mentioned above, is a [padded
location](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding), so all direct types are
padded to a full word in the manner described in the [direct types
table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).

There are two special cases that must be noted here, that each take up two words
instead of one.  The first special case is that of external functions.  An
external function is represented by a 20-byte address and a 4-byte selector;
these are stored in two separate words, with the address in the bottom word and
the selector in the top word.  Both these are zero-padded on the *left*, not the
right [like in the other padded locations](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).

The second two-word special case is that of pointers to calldata lookup types;
see the section on [pointers to calldata from the
stack](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata-from-the-stack) for details.

#### The stack: Data layout

Stack variables are local variables, so naturally things will change as the
contract executes.  But, we can still describe how things are at any given
time.  Note that if you are actually writing a debugger, you may want to rely
on other systems to determine data layout on the stack.

The stack is of course not used only for storing local variables, but also as a
working space.  And of course it also holds return addresses.  The stack is
divided into stackframes; each stackframe begins with the return address.
(There is no frame pointer, for those used to such a thing; just a return
address.)  The exceptions are constructors and fallback/receive functions, which do not
include a return address.  In addition, if the initial function call (i.e.
stackframe) of the EVM stackframe (i.e. message call or creation call) is not a
constructor, and the contract has external functions other than the constructor,
fallback, and receive functions, then
the function selector will be stored on the stack below the first
stackframe.  (Additionally, in Solidity 0.4.20 and later, an extra zero word
will appear below that on the stack if you're within a library call.)

Note that function modifiers and base constructor invocations (whether placed
on the constructor or on the contract) do not create new stackframes; these are
part of the same stackframe as the function that invoked them.

Within each stackframe, all variables are always stored below the workspace. So
while the workspace may be unpredictable, we can ignore it for the purposes of
data layout within a given stackframe.  (Of course, the workspace in one
stackframe does come between that stackframe's variables and the start of the
next stackframe.)

Restricting our attention to the variables, then, the stack acts, as expected,
as a stack; variables are pushed onto it when needed, and are popped off of it
when no longer needed.  These pushes and pops are arranged in a way that is
compatible with the stack structure; i.e., they are in fact pushes and pops.

The parameters of the function being called, including output parameters, are
pushed onto the stack when the function is called and the stackframe is
entered, and are not popped until the function, *including all modifiers*,
exits.  It's necessary here to specify the order they go onto the stack.  First
come the input parameters, in the order they were given, followed by the output
parameters, in the order they were given.  Anonymous output parameters are
treated the same as named output parameters for these purposes.  Similarly,
parameters for fallback functions are not treated specially here, but work
like any other parameters.

*Remark*: Yul functions work slightly differently here, in that output parameters
are pushed onto the stack in the *reverse* of the order they were given.

Ordinary local variables, as declared in a function or modifier, are pushed
onto the stack at their declaration and are popped when their containing block
exits (for variables declared in the initializer of a `for` loop, the
containing block is considered to be the `for` loop).  If multiple variables
are declared within a single statement, they go on the stack in the order they
were declared within that statement.

Parameters to a modifier are pushed onto the stack when that modifier begins
and are popped when that modifier exits.  Again, they go in the stack in the
order they were given.  Note that (like other local variables declared in
modifiers) these variables are still on the stack while the placeholder
statement `_;` is running, even if they are inaccessible.  Remember that
modifiers are run in order from left to right, and that they may be applied
to constructors, fallback functions, and receive functions.

This leaves the case of parameters to base constructor invocations (whether on
the constructor or on the contract).  When a constructor is called, not only
are its parameters pushed onto the stack, but so are all the parameters to all
of its base constructors -- not just the direct parents, but for all ancestors.
They go on in order from most derived to most base, as determined by the usual
[C3 order](https://en.wikipedia.org/wiki/C3_linearization)
(discussed more in the [section on storage layout below](#user-content-locations-in-detail-storage-in-detail-storage-data-layout)).  Note that if
the base constructors are listed on the constructor declaration, the order has
no effect; only the order that the base classes are listed on the class
declaration matters here.  Within each base constructor's parameter region, the
parameters are pushed on in order from left to right.  Constructors then
execute in order from most base to most derived (again, note that the order
they're listed on the constructor declaration has no effect); when a
constructor exits, its parameters are popped from the stack.  Modifiers on a
constructor or base constructor are handled when that constructor or base
constructor runs.

Paramters to a modifier on a fallback or receive function work like parameters
to a modifier on any other function.  Note that parameters to a modifier on a
constructor only go onto the stack when that particular constructor is about to
run (i.e., all base constructors that run before it have exited).

### Code in detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

Once a contract has been deployed, its immutable state variables are stored in its code.

#### Code: direct types

Only direct types may go in code as immutables.  In addition, `function external`
variables are currently barred from being used as immutables.

Note that while code is a padded location, its padding works slightly unusually.
In code, all types are zero-padded, even if ordinarily they would be sign-padded.
Note that this does not alter whether they are padded on the right or on the left;
that is still as normal.

#### Code: data layout

Where in the code immutables may be found is basically unpredictable in
advance.  However, you may use the Solidity compiler's `immutableReferences`
output to determine this information.  Note that immutables that are never
actually read from will not appear here -- as they won't actually appear
anywhere in the code, either!  Immutables are simply inlined into the code
wherever they're read from, so if they're never read from, their value isn't
actually stored anywhere.

Note that code has no notion of "slots"; the variables are simply placed wherever
the compiler places them, among the code.

### Memory in detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

Memory is used in two different ways.  Its ordinary use is to hold variables
declared as living in memory.  Its secondary use, however, is to hold
immutables during contract construction.

We won't discuss layout in memory in the first context, since, as mentioned, we
only access it via pointers.  However, we will discuss layout in memory for the
case of immutables in memory.

*Remark*: Although memory objects ordinarily start on a word, there is a bug in
versions 0.5.3, 0.5.5, and 0.5.6 of Solidity specifically that can occasionally cause them to
start in the middle of a word.  In this case, for the purposes of decoding that
object, you should consider slots to begin at the beginning of that object. (Of
course, once you follow a pointer, you'll have to have your slots based on that
pointer.  Again, since we only access memory through pointers, this is mostly
not a concern, and it only happens at all in those specific versions of Solidity.)

#### Memory: Direct types and pointer types

Memory is a [padded location](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding), so
direct types are padded as [described in their table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).
Pointers, as mentioned above, always take up a full word.

Note that immutables stored in memory have unusual padding; they are always
zero-padded on the right, regardless of their usual padding.  Again, note that
this only applies to immutables stored directly in memory during contract
construct, and not to direct types appearing as elements of another type in
memory in memory's normal use.

#### Layout of immutables in memory

Immutable state variables are stored in memory during contract construction.
(Or at least, for most of it; towards the end of contract construction memory
will be overwritten by the code of the contract being constructed.)

Immutable state variables are stored one after the other starting at memory
address `0x80` (skipping the first four words of memory as Solidity reserves
these for internal purposes).  Memory being a padded location, each takes up
one word (although note that as per the [previous
subsection](#user-content-locations-in-detail-memory-in-detail-memory-direct-types-and-pointer-types)
the padding on immutables is unusual).  This just leaves the question of the
order that they are stored in.

For the simple case of a contract without inheritance, the immutable state
variables are stored in the order that they are declared.  In the case of
inheritance, the variables of the base class go before those of the derived
class.  In cases of multiple inheritance, Solidity uses the [C3
linearization](https://en.wikipedia.org/wiki/C3_linearization) to order classes
from "most base" to "most derived", and then, as mentioned above, lays out
variables starting with the most base and ending with the most derived.
(Remember that, when listing parent classes, Solidity considers parents listed
*first* to be "more base"; as the [Solidity docs
note](https://docs.soliditylang.org/en/v0.8.9/contracts.html#multiple-inheritance-and-linearization),
this is the reverse order from, say, Python.)

#### Memory: Multivalue types

A multivalue type in memory is simply represented by concatenating together the
representation of its elements; with the exceptions that elements of reference
type (both multivalue and lookup types), other than mappings, are [represented
as
pointers](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory).
(Also, prior to Solidity 0.7.0, elements of `mapping` type, as well as
(possibly multidimensional) arrays of such, were allowed in memory structs and
were simply omitted, as mappings cannot appear in memory.) As such, each
element (that isn't omitted) takes up exactly one word (because direct types
are padded and all reference types are stored as pointers).  Elements of
structs go in the order they're specified in.

(Note that prior to Solidity 0.7.0 it was possible to have in memory a struct
that contains *only* mappings, and prior to 0.5.0, it was possible to have a
struct that was empty entirely, or a statically-sized array of length 0.  Such
a struct or array doesn't really have a representation in memory, since in
memory it has zero length.  Of course, since we only access memory through
pointers, if we are given a pointer to such a struct or array, we need not
decode anything, as all of the struct's elements have been omitted.  The actual
location pointed to may contain junk and should be ignored.)

Note that it is possible to have circular structs -- not just circular struct
types, but actual circular structs -- in memory.  This is not possible in any
other location.

#### Memory: Lookup types

There are two lookup types that can go in memory: `type[]` and `bytes` (there is
also `string`, but [we will not treat that separately from
`bytes`](#user-content-types-overview-overview-of-the-types-lookup-types)).

A dynamic array of type `type[]` is represented by a slot containing the length
of the array (call it `n`), followed immediately by the array itself,
represented just as if it were an array of type `type[n]`; see the [section
above](#user-content-locations-in-detail-memory-in-detail-memory-multivalue-types).

A `bytes` is represented by a slot containing the length of the bytestring,
followed by a sequence of slots containing the bytestring; the bytes in the
string are *not* individually padded, but rather are simply stored in sequence.
Since the last slot may not contain a full 32 bytes, it is zero-padded on the
right.

*Remark*: In a few specific versions of Solidity, there is a bug that can cause
particular `bytes` and `string`s to lack the padding on the end, resulting in the alignment bug
[mentioned above](#user-content-locations-in-detail-memory-in-detail).


#### Pointers to memory

Pointers to memory are absolute and given in bytes.  Since memory is padded, all
pointers will point to the start of a word and thus be a multiple of `0x20`.
(With the exception, [mentioned above](#user-content-locations-in-detail-memory-in-detail),
of some pointers in some specific versions of Solidity.)

The pointer `0x60` is something of a null pointer; it points to a reserved slot
which is always zero.  By the previous section, this slot can therefore
represent any empty variable of lookup type in memory, and in fact it's used as
a default value for memory pointers of lookup type.

### Calldata in detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

Calldata is largely the same as [memory](#user-content-locations-in-detail-memory-in-detail); so rather than
describing calldata from scratch, we will simply describe how it differs from
memory.

Importantly, we will use a different convention when talking about "slots" in
calldata; see the [following subsection](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset).
(Although it's not *that* important, since, like with memory, we only access
calldata through pointers.  You just don't want to find yourself surprised by
it.)

#### Slots in calldata and the offset

The first four bytes of calldata are the function selector, and are not followed
by any padding.  As such, in calldata, we consider words and slots to begin not
on the [usual word boundaries](#user-content-locations-basics) (multiples of `0x20`) but
rather to begin offset by 4-bytes; "slots" in calldata will begin at bytes whose
address is congruent to `0x4` modulo `0x20`.  (Since calldata is byte-based
rather than word-based, this offset is not disastrous like it would be in, say,
storage.)

Because we will only access calldata through pointers, this offset is not that
relevant, but it is worth noting.

Also note that in constructors, there is no 4-byte offset, but that's because in
constructors, calldata is empty (the special variable `msg.sig` is padded to
contain 4 zero bytes).  Parameters passed to constructors actually go in *code*
rather than calldata -- and are represented the same way but with a different
offset -- but since we will only deal with them once they have been copied onto
the stack or into memory, we will ignore this.

#### Calldata: Direct types and pointer types

Direct types are the [same as in memory](#user-content-locations-in-detail-memory-in-detail-memory-direct-types-and-pointer-types).
Nothing more needs to be said. [Pointers to calldata](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata)
are a bit different from
[pointers to memory](#user-content-locations-in-detail-memory-in-detail-pointers-to-memory),
but you can see below about that.

#### Calldata: Multivalue and lookup types (reference types)

In order to understand reference types in calldata, we need the distinction of
*static* and *dynamic* types that was [introduced earlier](#user-content-types-overview-terminology).

With that in hand, then, variables of reference type in calldata are stored
similarly to in memory ([1](#user-content-locations-in-detail-memory-in-detail-memory-multivalue-types),
[2](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types)), with the difference that any of their elements of
static reference type are *not* stored as pointers, but are simply stored
inline; so unlike in memory, elements may take up multiple words.  Elements of
dynamic type are still stored as pointers (but see the [section
below](#user-content-locations-in-detail-calldata-in-detail-pointers-to-calldata) about how those work).

Also, structs that contain mappings (or arrays of such) are entirely illegal in
calldata, unlike in memory where the mappings are simply omitted.

*Remark*: Calldata variables were only introduced in Solidity 0.5.0, so it is
impossible to have variables of zero-element multivalue type in calldata;
however, it still may be worth noting for other purposes that in the underlying
encoding, such variables are omitted entirely in calldata (unlike in storage
where they still take up a single word, or memory where it varies).

##### The special variable `msg.data`

While I've thus far avoided discussing special variables, it's worth pausing
here to discuss the special variable `msg.data`, the one special variable of
reference type.  It is a `bytes calldata`.  But it's not represented like other
variables of type `bytes calldata`, is it?  It's not some location in calldata
with the number of bytes followed by the string of bytes; it simply *is* all of
calldata.  Accesses to it are simply accesses to the string of bytes that is
calldata.

This raises the question: Given that calldata is of variable length, where is
the length of `msg.data` stored?  The answer, of course, is that this length is
what is returned by the `CALLDATASIZE` instruction.  This instruction could be
considered something of a special location, and indeed many of the Solidity
language's special [globally available
variables](https://docs.soliditylang.org/en/v0.8.9/units-and-global-variables.html)
are "stored" in such special locations, each with their own EVM opcode.

We have thus far ignored these special locations here and how they are encoded.
However, since [the variables kept in these other special
locations](https://docs.soliditylang.org/en/v0.8.9/units-and-global-variables.html#block-and-transaction-properties)
are all of type `uint256`, `address`, or `address payable`; these special locations are
word-based rather than byte-based (to the extent that distinction is meaningful
here); and values from these special locations will always be copied to the
(also word-based) stack before use, there is little to say about encoding in
these special locations.   One could say that addresses are, as always,
zero-padded on the left, and that integers are, as always, stored in binary; and
these statements would be true in a sense, but also largely meaningless.

Anyway, none of this is really relevant here, so let's move on from this
digression and discuss pointers to calldata.

#### Pointers to calldata

Pointers to calldata are different depending on whether they are from calldata
or from the stack; and pointers to calldata from the stack are different
depending on whether they point to a multivalue type or to a lookup type.

Note, by the way, that there is no need for any sort of
[null pointer](#user-content-locations-in-detail-pointers-to-memory) in calldata, and so no equivalent exists.
(Variables in calldata of lookup type may be empty, of course, but distinct
empty calldata variables are kept separate from another, not coalesced into a
single null location like in memory.)

#### Pointers to calldata from calldata

Pointers to calldata from calldata are relative, though in a slightly unusual
manner.  They are also given in bytes, but are relative not to the current
location, but rather to the [structure they are a part
of](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types) (since they never
stand alone.)

For pointers to calldata stored in variables of multivalue type, the pointer is
relative to the start of that containing variable.

For pointers to calldata stored in variables of lookup type, the pointer is
relative to the start of the list of elements, i.e., the word *after* the length.

Or, to put it differently, either way it is always relative to the start of the
list of elements it is contained in.

Note that pointers to calldata from calldata will always be multiples of `0x20`,
since calldata, like memory, is padded (and these pointers are relative rather
than absolute).

#### Pointers to calldata from the stack

Pointers to a calldata multivalue types from the stack work just like [pointers
to memory](#user-content-locations-in-detail-pointers-to-memory): They are
absolute, given in bytes, and always point to the start of a word.  In
calldata, though, the [start of a word](#user-content-locations-in-detail-calldata-in-detail-slots-in-calldata-and-the-offset)
is congruent to `0x4` modulo `0x20`, rather than being a multiple of `0x20`.

Pointers to calldata lookup types from the stack take up two words on the stack
rather than just one.  The bottom word is a pointer -- absolute and given in
bytes -- but points not to the word containing the length, but rather the start
of the content, i.e., the word after the length (as described in the section on
[lookup types in memory](#user-content-locations-in-detail-memory-in-detail-memory-lookup-types)), since [lookup types in
calldata](#user-content-locations-in-detail-calldata-in-detail-calldata-multivalue-and-lookup-types-reference-types) are
similar).  The top word contains the length.  Note, obviously, that if the length is
zero then the value of the pointer is irrelevant (and the word it points to may
contain unrelated data).


### Storage in detail
{"gitdown": "scroll-up", "upRef": "#user-content-locations-in-detail", "upTitle": "Back to Locations in Detail"}

Storage, unlike the other locations mentioned thus far, is a
[packed](#user-content-types-overview-overview-of-the-types-direct-types-basics-of-direct-types-packing-and-padding), not padded, location.
The sizes in bytes of the direct types can be found in the [direct types
table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).

Storage is the one location other than the stack where we sometimes access
variables directly rather than through pointers, so we will begin by describing
data layout in storage.

#### Storage: Data layout

Storage is used to hold all state variables that are not declared `constant` or
`immutable`.  In what follows, we ignore `constant` and `immutable` variables,
and look just at the ordinary state variables.  (Variables declared `constant`
are optimized out by the compiler; variables declared `immutable` are stored in
[code](#user-content-locations-in-detail-code-in-detail-code-data-layout) or [memory](#user-content-locations-in-detail-memory-in-detail-layout-of-immutables-in-memory) instead.)

First, we consider the case of a contract that does not inherit from any others.

In this case, state variables in storage are always laid out in the order that they were declared,
starting from the beginning of storage.  However, within a word, variables are
laid out from *right to left*, not left to right (with one sort-of-exception to
be [described later](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types)).  Variables of direct type may not
cross a word boundary; if there is not enough room left at the top of a word for
what comes next, the unused space at the top of the word remains filled with
zeroes, and the next variable starts at the bottom of the next word.

Note that this right-to-left orientation does not mean that the representations
of direct types themselves are in any way reversed, only the order they're laid
out in within a word.

Vaiables of lookup type are, for this purpose, regarded as taking up one word;
see the [subsection on lookup types](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types) for more
information.

Variables of multivalue type must start on a word boundary, and always occupy
whole words (i.e. the next variable after must start on a word boundary).

As mentioned above, variables declared `constant` or `immutable` are skipped.

Subject to the above restrictions, every variable is placed as early as
possible.

Now, we consider inheritance.

In cases of inheritance, the variables of the base class go before those of the
derived class.  Note that there is *not* any sort of barrier between the
variables of the base class and those of the derived class; variables of the
base class and variables of the derived class may share a slot (so the first
variable of the derived class need not start on a slot boundary).

In cases of multiple inheritance, Solidity uses the [C3
linearization](https://en.wikipedia.org/wiki/C3_linearization) to order classes
from "most base" to "most derived", and then, as mentioned above, lays out
variables starting with the most base and ending with the most derived.
(Remember that, when listing parent classes, Solidity considers parents listed
*first* to be "more base"; as the [Solidity docs
note](https://docs.soliditylang.org/en/v0.8.9/contracts.html#multiple-inheritance-and-linearization),
this is the reverse order from, say, Python.)

#### Storage: Direct types

The layout of direct types has already been described
[above](#user-content-locations-in-detail-storage-in-detail-storage-data-layout), and the sizes of the direct types are found in the
[direct types table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types).  Note that there are [no pointer
types in storage](#user-content-types-overview-overview-of-the-types-pointer-types).

#### Storage: Multivalue types

Variables of multivalue type simply have the elements stored consecutively
within storage -- they are packed within the multivalue type [just as variables
are packed within storage](#user-content-locations-in-detail-storage-in-detail-storage-data-layout).  The rules are exactly the same.

The one exceptions is that (in pre-0.5.0 versions of Solidity where this was
legal) multivalue types with zero elements still take up a single word, rather
than zero words.  (So, for instance, a `uint[2][0]` takes up 1 word, and a
`bytes1[0][3]` takes up 3 words.)

Again, remember that variables of multivalue type must occupy whole words; they
start on a word boundary, and whatever comes after starts on a word boundary
too.  And, obviously, this applies to variables of multivalue type *within*
another variable of multivalue type since, as mentioned, the rules are exactly
the same.   (But I thought that case was worth highlighting.)

#### Storage: Lookup types

There are three lookup types that can go in storage: `type[]`, `bytes` (and
`string`, but [again we will not treat that
separately](#user-content-types-overview-overview-of-the-types-lookup-types)), and `mapping(keyType =>
elementType)`.

As [mentioned above](#user-content-locations-in-detail-storage-in-detail-storage-data-layout), we regard each lookup type as taking
up one word; we will call this the "main word".

For `type[]`, i.e. an array, the main word contains the length of the array.
Suppose the main word is in slot `p` and the length it contains is `n`.  Then
the array itself is stored exactly as if it were an array of type `type[n]`
([see section above](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types)), except that it starts in the
slot `keccak256(p)`.

(Yes, that is the *position* being used; no explicit pointer to the array
location is stored.  Other lookup types will be similar in this regard.)

For `bytes`, if the length (call it `n`) is less than 32, the low byte of the
main word contains `n<<1`, and the string of bytes itself is stored in the same
word, in sequence from *left to right*; any unused space within the word is left
as zero.

If, on the other hand, the length `n` is at least 32, then the low byte of the
main word contains `(n<<1)|0x1`, and the string of bytes is stored starting in
the slot `keccak256(p)`, where `p` is the position of the main word.  This
bytestring, too, goes from *left to right* within words, but (like an array) can
take up as many words as necessary.  Again, any unused space left within the
last word is left as zero.

(Type `bytes` (and `string`) is the one sort-of-exception I mentioned to the
[right-to-left rule within storage](#user-content-locations-in-detail-storage-in-detail-storage-data-layout).)

Finally, we have mappings.  For mappings, the main word itself is unused and
left as zero; only its position `p` is used.  Mappings, famously, do not store
what keys exist; keys that don't exist and keys whose corresponding element is
`0` (which is always the encoding of the default value
([1](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types), [2](#user-content-types-overview-overview-of-the-types-multivalue-types),
[3](#user-content-types-overview-overview-of-the-types-lookup-types), [4](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types),
[5](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types)) for anything in storage) are treated the same.

For a mapping `map` and a key `key`, then, the element `map[key]` is stored
starting at `keccak256(key . p)`, where `.` represents concatenation and `key`
here has been converted to a string of bytes -- something that is meaningful
for every [elementary type](#user-content-types-overview-overview-of-the-types-lookup-types) (the
legal key types).  For the elementary types which are direct, the padded form
is used; the value can be converted to a string of bytes by the representations
listed in the [section on direct types](#user-content-types-overview-overview-of-the-types-direct-types-representations-of-direct-types),
with the padding as listed in the [direct types table](#user-content-types-overview-overview-of-the-types-direct-types-table-of-direct-types);
for the lookup elementary type `bytes` ([and `string`](#user-content-types-overview-overview-of-the-types-lookup-types)),
well, this by itself represents a string of bytes!  (No padding is applied to
these.)  Similarly, the position `p` is regarded as a 32-byte unsigned integer,
because that is how storage locations are accessed.

Note that if an element of a mapping is of direct type, this means it will
always start on a slot boundary, even if it doesn't normally have to.  In any
case, regardless of type, the element is stored [exactly the same as it would be
anywhere else in storage](#user-content-locations-in-detail-storage-in-detail).

#### Pointers to storage

Pointers to storage are absolute and are measured in words (slots), not bytes.
(Such pointers are most easily regarded as pointing to the full slot, rather
than a byte position within it; if you like, though, you can imagine it pointing
to the *latest* position within the word, rather than the earliest, in
accordance with the [right-to-left nature of storage multivalue
types](#user-content-locations-in-detail-storage-in-detail-storage-multivalue-types), and the [use of the low
byte](#user-content-locations-in-detail-storage-in-detail-storage-lookup-types) in types `bytes` and `string`.)  This might seem to
limit the locations such a pointer can point to; however, pointers to storage
will always point to a variable of multivalue or lookup type, and such variables
always start on a word boundary, so there is no problem here.

Note that pointers to storage have a default value of `0x0`.  As stated earlier,
one must beware -- making use of such a pointer *can* lead to nonsense!  Such a
pointer should not actually be used.  (And note again that while it is legal to
leave a storage pointer uninitialized, it is not legal to delete one.)
