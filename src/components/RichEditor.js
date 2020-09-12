import React, { useEffect, useState } from "react"
import axios from "axios"
import {
  convertFromRaw,
  convertToRaw,
  Editor,
  EditorState,
  getDefaultKeyBinding,
  RichUtils,
  SelectionState,
} from "draft-js"
import { stateToHTML } from "draft-js-export-html"
import classNames from "classnames"

import pusher from "../services/pusher"
import { BlockStyleControls, InlineStyleControls } from "../components"

import "./RichEditor.css"

const styleMap = {
  CODE: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    fontSize: 16,
    padding: 2,
  },
}

export const RichEditor = () => {
  const [editorState, setEditorState] = useState(EditorState.createEmpty())
  const [text, setText] = useState("")

  const notifyPusher = text => {
    axios.post("http://localhost:5000/save-text", { text })
  }

  const notifyPusherEditor = editorState => {
    const selection = editorState.getSelection()
    const text = convertToRaw(editorState.getCurrentContent())
    axios.post("http://localhost:5000/editor-text", { text, selection })
  }

  const handleChange = editorState => {
    setEditorState(editorState)
    notifyPusher(stateToHTML(editorState.getCurrentContent()))
    notifyPusherEditor(editorState)
  }

  const getBlockStyle = block => {
    switch (block.getType()) {
      case "blockquote":
        return "RichEditor-blockquote"
      default:
        return null
    }
  }

  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command)
    if (newState) {
      handleChange(newState)
      return true
    }
    return false
  }

  const mapKeyToEditorCommand = e => {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(e, editorState, 4 /* maxDepth */)
      if (newEditorState !== editorState) {
        handleChange(newEditorState)
      }
      return
    }
    return getDefaultKeyBinding(e)
  }

  const toggleBlockType = blockType => {
    handleChange(RichUtils.toggleBlockType(editorState, blockType))
  }

  const toggleInlineStyle = inlineStyle => {
    handleChange(RichUtils.toggleInlineStyle(editorState, inlineStyle))
  }

  useEffect(() => {
    pusher
      .subscribe("editor")
      .bind("text-update", data => {
        setText(data.text)
      })
      .bind("editor-update", ({ selection, text }) => {
        // create a new selection state from new data
        const newSelection = new SelectionState({
          anchorKey: selection.anchorKey,
          anchorOffset: selection.anchorOffset,
          focusKey: selection.focusKey,
          focusOffset: selection.focusOffset,
        })
        // create new editor state
        const editorState = EditorState.createWithContent(convertFromRaw(text))
        const newEditorState = EditorState.forceSelection(
          editorState,
          newSelection
        )
        setEditorState(newEditorState)
      })
  }, [])

  // If the user changes block type before entering any text, hide the placeholder.
  const contentState = editorState.getCurrentContent()
  const isHidePlaceholder =
    !contentState.hasText() &&
    contentState.getBlockMap().first().getType() !== "unstyled"

  return (
    <div>
      <div className="RichEditor-root">
        <BlockStyleControls
          editorState={editorState}
          onToggle={toggleBlockType}
        />
        <InlineStyleControls
          editorState={editorState}
          onToggle={toggleInlineStyle}
        />
        <div
          className={classNames("RichEditor-editor", {
            "RichEditor-hidePlaceholder": isHidePlaceholder,
          })}
        >
          <Editor
            blockStyleFn={getBlockStyle}
            customStyleMap={styleMap}
            editorState={editorState}
            handleKeyCommand={handleKeyCommand}
            keyBindingFn={mapKeyToEditorCommand}
            onChange={handleChange}
            placeholder="What's on your mind?"
            spellCheck={true}
          />
        </div>
      </div>
      <div
        className="col-12 col-md-6 mt-3"
        dangerouslySetInnerHTML={{ __html: text }}
      />
    </div>
  )
}
