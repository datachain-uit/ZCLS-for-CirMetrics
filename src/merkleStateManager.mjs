export class StateTreeManager {
    constructor(maxDepth, hashFunction) {
        this.maxDepth = maxDepth
        this.hashFunction = hashFunction

        // node -> index at level 0
        this.leafIndexMap = {}

        // [level, index] -> node
        this.nodePositionMap = {}

        // level -> zero at the level
        this.defaultValues = []

        this.nextLeafIndex = 0

        let currentZero = 0n

        for (let level = this.maxDepth; level >= 1; level--) {
            this.defaultValues[level] = currentZero

            currentZero = this.hashFunction(currentZero, currentZero)
        }

        this.defaultValues[0] = currentZero
    }

    append(leafValue, shouldUpdateState = false) {
        this.insert(this.nextLeafIndex, leafValue, shouldUpdateState)

        this.nextLeafIndex++
    }

    appendMultiple(leafValues, shouldUpdateState = false) {
        for (let leafValue of leafValues) {
            this.append(leafValue, shouldUpdateState)
        }
    }

    insert(leafIndex, leafValue, shouldUpdateState = false) {
        if (shouldUpdateState) {
            this.updateTreeState(leafIndex)
        }

        this.leafIndexMap[leafValue] = leafIndex
        this.nodePositionMap[[this.maxDepth, leafIndex]] = leafValue
    }

    remove(leafIndex) {
        let leafValue = this.nodePositionMap[[this.maxDepth, leafIndex]]

        if (!leafValue) {
            return false
        }

        delete this.leafIndexMap[leafValue]
        delete this.nodePositionMap[[this.maxDepth, leafIndex]]

        this.updateTreeState(leafIndex)

        return true
    }

    updateTreeState(leafIndex) {
        let currentIndex = leafIndex

        for (let currentLevel = this.maxDepth; currentLevel >= 0; currentLevel--) {
            if (currentLevel != this.maxDepth) {
                delete this.nodePositionMap[[currentLevel, currentIndex]]
            }

            currentIndex = Math.floor(currentIndex / 2)
        }
    }

    getLeafIndex(leafValue) {
        return this.leafIndexMap[leafValue]
    }

    getNode(level, index) {
        if (index > ((this.nextLeafIndex - 1) >> (this.maxDepth - level))) {
            return this.defaultValues[level]
        }

        let result = this.nodePositionMap[[level, index]]

        if (result == undefined) {
            if (level < this.maxDepth) {
                result = this.hashFunction(this.getNode(level + 1, 2 * index), this.getNode(level + 1, (2 * index) + 1))
            }
            else {
                return this.defaultValues[level]
            }
        }

        this.nodePositionMap[[level, index]] = result
        return result
    }

    getRoot() {
        return this.getNode(0, 0)
    }

    getProof(leafIndex) {
        return this.getLevelProof(leafIndex, 0)
    }

    getLevelProof(leafIndex, targetLevel) {
        let proofSiblings = []
        let proofDirections = []

        let currentIndex = leafIndex

        for (let level = this.maxDepth; level >= (targetLevel + 1); level--) {
            if (currentIndex & 0x1) {
                proofSiblings[level] = this.getNode(level, currentIndex - 1)
                proofDirections[level] = false
            }
            else {
                proofSiblings[level] = this.getNode(level, currentIndex + 1)
                proofDirections[level] = true
            }

            currentIndex = Math.floor(currentIndex / 2)
        }

        // For levels not asked, just place default values
        for (let level = targetLevel; level >= 1; level--) {
            proofSiblings[level] = 0n
            proofDirections[level] = false
        }

        let targetValue = this.getNode(targetLevel, currentIndex)

        proofSiblings.shift()
        proofDirections.shift()

        //console.log([targetValue, proofSiblings, proofDirections])
        return [targetValue, proofSiblings, proofDirections]
    }

    size() {
        return this.nextLeafIndex
    }

    hasLeaf(leafValue) {
        return this.leafIndexMap[leafValue] !== undefined
    }

    getLeafCount() {
        return Object.keys(this.leafIndexMap).length
    }

    verifyProof(leafIndex, leafValue, proofSiblings, proofDirections) {
        let computedHash = leafValue
        let currentIndex = leafIndex

        for (let i = 0; i < proofSiblings.length; i++) {
            let sibling = proofSiblings[i]
            let isRightChild = proofDirections[i]

            if (isRightChild) {
                computedHash = this.hashFunction(sibling, computedHash)
            } else {
                computedHash = this.hashFunction(computedHash, sibling)
            }

            currentIndex >>= 1
        }

        return computedHash === this.getRoot()
    }
}
