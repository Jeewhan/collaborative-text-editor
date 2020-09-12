import React from "react"
import classNames from "classnames"

export const StyleButton = ({ onToggle, style, label, active }) => {
  const handleToggle = e => {
    e.preventDefault()
    onToggle(style)
  }

  return (
    <span
      className={classNames("RichEditor-styleButton", {
        "RichEditor-activeButton": active,
      })}
      onMouseDown={handleToggle}
      role="button"
      tabIndex={0}
    >
      {label}
    </span>
  )
}
