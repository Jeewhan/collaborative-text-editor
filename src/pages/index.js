import React, { Component } from "react"
import {
  Editor,
  EditorState,
  RichUtils,
  getDefaultKeyBinding,
  convertToRaw,
  convertFromRaw,
  SelectionState,
} from "draft-js"
import { stateToHTML } from "draft-js-export-html"
import Pusher from "pusher-js"
import axios from "axios"

import BlockStyleControls from "../components/blockStyleControls"
import InlineStyleControls from "../components/inlineStylesControls"
import "bootstrap/dist/css/bootstrap.css"

const styleMap = {
  CODE: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    fontSize: 16,
    padding: 2,
  },
}

class RichEditor extends Component {
  constructor(props) {
    super(props)
    this.state = { editorState: EditorState.createEmpty(), text: "" }
    this.focus = () => this.refs.editor.focus()
    this.onChange = editorState => {
      // update this line
      // onChange, update editor state then notify pusher of the new editorState
      this.setState({ editorState }, () => {
        // call the function to notify Pusher of the new editor state
        this.notifyPusher(
          stateToHTML(this.state.editorState.getCurrentContent())
        )
        this.notifyPusherEditor(this.state.editorState)
      })
    }
    this.handleKeyCommand = this._handleKeyCommand.bind(this)
    this.mapKeyToEditorCommand = this._mapKeyToEditorCommand.bind(this)
    this.toggleBlockType = this._toggleBlockType.bind(this)
    this.toggleInlineStyle = this._toggleInlineStyle.bind(this)
    this.getBlockStyle = this._getBlockStyle.bind(this)
    this.notifyPusher = this._notifyPusher.bind(this)
    this.notifyPusherEditor = this._notifyPusherEditor.bind(this)
  }

  componentWillMount() {
    this.pusher = new Pusher("ce14022937ba3e24f690", {
      cluster: "ap3",
      encrypted: true,
    })
    this.channel = this.pusher.subscribe("editor")
  }

  componentDidMount() {
    let self = this
    // listen to 'text-update' events
    this.channel.bind("text-update", function (data) {
      // update the text state with new data
      self.setState({ text: data.text })
    })
    // listen to 'editor-update' events
    this.channel.bind("editor-update", function (data) {
      // create a new selection state from new data
      let newSelection = new SelectionState({
        anchorKey: data.selection.anchorKey,
        anchorOffset: data.selection.anchorOffset,
        focusKey: data.selection.focusKey,
        focusOffset: data.selection.focusOffset,
      })
      // create new editor state
      let editorState = EditorState.createWithContent(convertFromRaw(data.text))
      const newEditorState = EditorState.forceSelection(
        editorState,
        newSelection
      )
      // update the RichEditor's state with the newEditorState
      self.setState({ editorState: newEditorState })
    })
  }

  // handle blockquote
  _getBlockStyle(block) {
    switch (block.getType()) {
      case "blockquote":
        return "RichEditor-blockquote"
      default:
        return null
    }
  }
  // handle key commands
  _handleKeyCommand(command, editorState) {
    const newState = RichUtils.handleKeyCommand(editorState, command)
    if (newState) {
      this.onChange(newState)
      return true
    }
    return false
  }
  // map the TAB key to the editor
  _mapKeyToEditorCommand(e) {
    if (e.keyCode === 9 /* TAB */) {
      const newEditorState = RichUtils.onTab(
        e,
        this.state.editorState,
        4 /* maxDepth */
      )
      if (newEditorState !== this.state.editorState) {
        this.onChange(newEditorState)
      }
      return
    }
    return getDefaultKeyBinding(e)
  }
  // toggle block styles
  _toggleBlockType(blockType) {
    this.onChange(RichUtils.toggleBlockType(this.state.editorState, blockType))
  }
  // toggle inline styles
  _toggleInlineStyle(inlineStyle) {
    this.onChange(
      RichUtils.toggleInlineStyle(this.state.editorState, inlineStyle)
    )
  }

  // send the editor's text with axios to the server so it can be broadcasted by Pusher
  _notifyPusher(text) {
    axios.post("http://localhost:5000/save-text", { text })
  }

  // send the editor's current state with axios to the server so it can be broadcasted by Pusher
  _notifyPusherEditor(editorState) {
    const selection = editorState.getSelection()
    let text = convertToRaw(editorState.getCurrentContent())
    axios.post("http://localhost:5000/editor-text", { text, selection })
  }

  render() {
    const { editorState } = this.state
    // If the user changes block type before entering any text, hide the placeholder.
    let className = "RichEditor-editor"
    var contentState = editorState.getCurrentContent()
    if (!contentState.hasText()) {
      if (contentState.getBlockMap().first().getType() !== "unstyled") {
        className += " RichEditor-hidePlaceholder"
      }
    }
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="RichEditor-root col-12 col-md-6">
            {/* render our editor block style controls components */}
            <BlockStyleControls
              editorState={editorState}
              onToggle={this.toggleBlockType}
            />
            {/* render our editor's inline style controls components */}
            <InlineStyleControls
              editorState={editorState}
              onToggle={this.toggleInlineStyle}
            />
            <div className={className} onClick={this.focus}>
              {/* render the Editor exposed by Draft.js */}
              <Editor
                blockStyleFn={this.getBlockStyle}
                customStyleMap={styleMap}
                editorState={editorState}
                handleKeyCommand={this.handleKeyCommand}
                keyBindingFn={this.mapKeyToEditorCommand}
                onChange={this.onChange}
                placeholder="What's on your mind?"
                ref="editor"
                spellCheck={true}
              />
            </div>
          </div>
          <div className="col-12 col-md-6">
            {/* render a preview for the text in the editor */}
            <div dangerouslySetInnerHTML={{ __html: this.state.text }} />
          </div>
        </div>
      </div>
    )
  }
}
export default RichEditor
