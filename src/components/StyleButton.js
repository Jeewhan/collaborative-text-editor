import React from "react"

export const StyleButton = ({ onToggle, style, label, active }) => {
  const handleToggle = e => {
    e.preventDefault()
    onToggle(style)
  }

  let className = "RichEditor-styleButton"
  if (active) {
    className += " RichEditor-activeButton"
  }

  return (
    <span className={className} onMouseDown={handleToggle}>
      {label}
    </span>
  )
}
