// Explicit trait methods preserve the public methods available before moonc 0.10.14.

///|
pub extend Span with Eq::{not_equal, equal}

///|
pub extend Span with ToJson::{to_json}

///|
pub extend Value with Eq::{not_equal, equal}

///|
pub extend Attribute with Eq::{not_equal, equal}

///|
pub extend Control with Eq::{not_equal, equal}

///|
pub extend Modification with Eq::{not_equal, equal}

///|
pub extend Body with Eq::{not_equal, equal}

///|
pub extend Record with Eq::{not_equal, equal}

///|
pub extend Document with Eq::{not_equal, equal}

///|
pub extend Diagnostic with Eq::{not_equal, equal}

///|
pub extend Diagnostic with ToJson::{to_json}

///|
pub extend Options with Eq::{not_equal, equal}

///|
pub extend NameValue with Eq::{not_equal, equal}

///|
pub extend NameAssertion with Eq::{not_equal, equal}

///|
pub extend RelativeName with Eq::{not_equal, equal}

///|
pub extend DistinguishedName with Eq::{not_equal, equal}

///|
pub extend NameError with Eq::{not_equal, equal}

///|
pub extend NameError with ToJson::{to_json}

///|
pub extend PageQuery with Eq::{not_equal, equal}

///|
pub extend RiskPolicy with Eq::{not_equal, equal}

///|
pub extend RiskPolicy with ToJson::{to_json}

///|
pub extend ProfileIssue with Eq::{not_equal, equal}

///|
pub extend ProfileIssue with @moonbitlang/core/debug.Debug::{to_repr}

///|
pub extend ProfileIssue with ToJson::{to_json}

///|
pub extend ReviewItem with Eq::{not_equal, equal}

///|
pub extend Review with Eq::{not_equal, equal}

///|
pub extend ReviewMetadata with Eq::{not_equal, equal}

///|
pub extend WriteError with @moonbitlang/core/debug.Debug::{to_repr}
