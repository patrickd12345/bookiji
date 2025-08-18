/**
 * ESLint rule: button-accessibility
 * 
 * Catches <button> elements without accessible names before they hit Playwright
 * 
 * Usage in .eslintrc.js:
 * {
 *   "rules": {
 *     "./scripts/eslint-button-accessibility": "error"
 *   }
 * }
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure buttons have accessible names (text, aria-label, or aria-labelledby)',
      category: 'Accessibility',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      missingAccessibleName: 'Button must have visible text, aria-label, or aria-labelledby for screen readers',
      iconOnlyNeedsLabel: 'Icon-only button detected - add aria-label="{{suggestion}}" or visible text',
      emptyAriaLabel: 'Empty aria-label provides no value - use descriptive text or remove attribute',
    },
  },

  create(context) {
    /**
     * Check if a JSX element has accessible text content
     */
    function hasVisibleText(node) {
      if (!node.children) return false;
      
      return node.children.some(child => {
        // Text nodes
        if (child.type === 'Literal' || child.type === 'JSXText') {
          return child.value && child.value.trim().length > 0;
        }
        
        // JSX expressions that might contain text
        if (child.type === 'JSXExpressionContainer') {
          return true; // Assume expression contains text (could be refined)
        }
        
        // Child elements that might contain text
        if (child.type === 'JSXElement') {
          return hasVisibleText(child);
        }
        
        return false;
      });
    }

    /**
     * Check if element has screen-reader-only text (sr-only class)
     */
    function hasScreenReaderText(node) {
      if (!node.children) return false;
      
      return node.children.some(child => {
        if (child.type === 'JSXElement' && child.openingElement.name.name === 'span') {
          const classAttr = child.openingElement.attributes.find(
            attr => attr.name && attr.name.name === 'className'
          );
          
          if (classAttr && classAttr.value) {
            const classValue = classAttr.value.value || '';
            return classValue.includes('sr-only') || classValue.includes('screen-reader-only');
          }
        }
        
        return hasScreenReaderText(child);
      });
    }

    /**
     * Get aria-label value if present
     */
    function getAriaLabel(attributes) {
      const ariaLabel = attributes.find(
        attr => attr.name && attr.name.name === 'aria-label'
      );
      
      if (!ariaLabel || !ariaLabel.value) return null;
      
      if (ariaLabel.value.type === 'Literal') {
        return ariaLabel.value.value;
      }
      
      // For expressions, assume they're valid (could be refined)
      return 'EXPRESSION';
    }

    /**
     * Check if element has aria-labelledby
     */
    function hasAriaLabelledBy(attributes) {
      return attributes.some(
        attr => attr.name && attr.name.name === 'aria-labelledby'
      );
    }

    /**
     * Suggest aria-label based on common button patterns
     */
    function suggestAriaLabel(node) {
      const children = node.children || [];
      
      // Look for icon names in JSX element names
      for (const child of children) {
        if (child.type === 'JSXElement' && child.openingElement.name.name) {
          const iconName = child.openingElement.name.name.toLowerCase();
          
          if (iconName.includes('close') || iconName.includes('x')) return 'Close';
          if (iconName.includes('menu') || iconName.includes('hamburger')) return 'Open menu';
          if (iconName.includes('search')) return 'Search';
          if (iconName.includes('plus') || iconName.includes('add')) return 'Add';
          if (iconName.includes('edit') || iconName.includes('pencil')) return 'Edit';
          if (iconName.includes('delete') || iconName.includes('trash')) return 'Delete';
          if (iconName.includes('download')) return 'Download';
          if (iconName.includes('upload')) return 'Upload';
          if (iconName.includes('play')) return 'Play';
          if (iconName.includes('pause')) return 'Pause';
          if (iconName.includes('heart') || iconName.includes('like')) return 'Like';
          if (iconName.includes('share')) return 'Share';
        }
      }
      
      return 'Button action';
    }

    return {
      'JSXElement[openingElement.name.name="button"]'(node) {
        const attributes = node.openingElement.attributes || [];
        
        // Check for accessible name sources
        const ariaLabel = getAriaLabel(attributes);
        const hasAriaLabelledBy = hasAriaLabelledBy(attributes);
        const hasVisibleTextContent = hasVisibleText(node);
        const hasSrOnlyText = hasScreenReaderText(node);
        
        // Empty aria-label is worse than no aria-label
        if (ariaLabel === '') {
          context.report({
            node: node.openingElement,
            messageId: 'emptyAriaLabel',
          });
          return;
        }
        
        // Check if button has any accessible name
        const hasAccessibleName = ariaLabel || hasAriaLabelledBy || hasVisibleTextContent || hasSrOnlyText;
        
        if (!hasAccessibleName) {
          const suggestion = suggestAriaLabel(node);
          
          context.report({
            node: node.openingElement,
            messageId: 'iconOnlyNeedsLabel',
            data: { suggestion },
          });
        }
      },
    };
  },
};
