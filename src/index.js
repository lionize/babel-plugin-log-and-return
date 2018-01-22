import template from 'babel-template'

export default function(babel) {
  const { types: t } = babel

  const pathsToLog = []

  return {
    name: 'captains-log',
    visitor: {
      Program: {
        exit(programPath) {
          if (!pathsToLog.length) {
            return
          }

          const name = insertLogFunction(programPath)

          pathsToLog.forEach(path => {
            const logExpression = template(`NAME(EXPRESSION)`)({
              NAME: name,
              EXPRESSION: path,
            })

            if (path.parentPath.type === 'ReturnStatement') {
              path.parentPath.replaceWith(
                t.returnStatement(logExpression.expression),
              )
            } else {
              path.replaceWith(logExpression)
            }
          })
        },
      },

      ExpressionStatement(path) {
        if (isLoggableExpression(path)) {
          pathsToLog.push(path)
        }
      },

      ReturnStatement(path) {
        if (isLoggableExpression(path)) {
          pathsToLog.push(path.get('argument'))
        }
      },
    },
  }
}

const insertLogFunction = path => {
  const name = path.scope.generateUidIdentifier('l')
  const buildLogFunction = template(
    `function NAME(x) { console.log(x); return x; }`,
  )
  const ast = buildLogFunction({
    NAME: name,
  })
  path.node.body.push(ast)
  return name
}

const isLog = comment => comment.value.trim() === '@log'

const isLoggableExpression = path => {
  if (path.node && path.node.leadingComments) {
    const found = path.node.leadingComments.find(isLog)
    if (found) {
      return true
    }
  }
}
